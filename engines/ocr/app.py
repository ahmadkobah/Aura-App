from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import tempfile
import logging
from typing import Dict, List, Optional
import pytesseract
import easyocr
from PIL import Image
import cv2
import numpy as np
from pdf2image import convert_from_path
import redis
import json
from langdetect import detect
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Aura OCR Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection for caching
try:
    redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
except Exception as e:
    logger.warning(f"Redis connection failed: {e}")
    redis_client = None

# EasyOCR reader initialization
easyocr_reader = easyocr.Reader(['en'])

class OCRResult(BaseModel):
    text: str
    confidence: float
    language: str
    pages: Optional[List[Dict]] = None
    processing_time: float
    engine: str

class OCRRequest(BaseModel):
    file_path: Optional[str] = None
    language: str = "en"
    preprocessing: bool = True
    engine: str = "tesseract"  # tesseract or easyocr

def preprocess_image(image_array: np.ndarray) -> np.ndarray:
    """Preprocess image for better OCR results"""
    # Convert to grayscale
    if len(image_array.shape) == 3:
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = image_array
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # Apply threshold to get binary image
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Deskew the image
    coords = np.column_stack(np.where(thresh > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    
    if abs(angle) > 0.5:  # Only correct if angle is significant
        (h, w) = thresh.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(thresh, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated
    
    return thresh

def extract_text_tesseract(image_array: np.ndarray, language: str = "eng", preprocess: bool = True) -> Dict:
    """Extract text using Tesseract OCR"""
    try:
        if preprocess:
            processed_img = preprocess_image(image_array)
        else:
            processed_img = image_array
        
        # Get detailed data including confidence scores
        data = pytesseract.image_to_data(processed_img, lang=language, output_type=pytesseract.Output.DICT)
        
        # Extract text and calculate average confidence
        text_parts = []
        confidences = []
        
        for i, word in enumerate(data['text']):
            if word.strip():
                text_parts.append(word)
                confidences.append(data['conf'][i])
        
        text = ' '.join(text_parts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            "text": text,
            "confidence": avg_confidence / 100.0,  # Normalize to 0-1
            "word_count": len(text_parts)
        }
    except Exception as e:
        logger.error(f"Tesseract OCR error: {e}")
        return {"text": "", "confidence": 0.0, "word_count": 0}

def extract_text_easyocr(image_array: np.ndarray, preprocess: bool = True) -> Dict:
    """Extract text using EasyOCR"""
    try:
        if preprocess:
            processed_img = preprocess_image(image_array)
        else:
            processed_img = image_array
        
        results = easyocr_reader.readtext(processed_img)
        
        text_parts = []
        confidences = []
        
        for (bbox, text, confidence) in results:
            if text.strip():
                text_parts.append(text)
                confidences.append(confidence)
        
        text = ' '.join(text_parts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            "text": text,
            "confidence": avg_confidence,
            "word_count": len(text_parts)
        }
    except Exception as e:
        logger.error(f"EasyOCR error: {e}")
        return {"text": "", "confidence": 0.0, "word_count": 0}

@app.post("/extract", response_model=OCRResult)
async def extract_text(file: UploadFile = File(...), request: OCRRequest = OCRRequest()):
    """Extract text from uploaded file"""
    import time
    start_time = time.time()
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Process based on file type
            if file.filename.lower().endswith('.pdf'):
                # Convert PDF to images
                images = convert_from_path(temp_file_path)
                all_text = []
                all_pages = []
                total_confidence = 0
                
                for i, image in enumerate(images):
                    img_array = np.array(image)
                    
                    if request.engine == "easyocr":
                        result = extract_text_easyocr(img_array, request.preprocessing)
                    else:
                        result = extract_text_tesseract(img_array, request.language, request.preprocessing)
                    
                    all_text.append(result["text"])
                    all_pages.append({
                        "page_number": i + 1,
                        "text": result["text"],
                        "confidence": result["confidence"],
                        "word_count": result["word_count"]
                    })
                    total_confidence += result["confidence"]
                
                final_text = '\n\n'.join(all_text)
                avg_confidence = total_confidence / len(images) if images else 0
                pages_data = all_pages
                
            else:
                # Process single image
                image = Image.open(temp_file_path)
                img_array = np.array(image)
                
                if request.engine == "easyocr":
                    result = extract_text_easyocr(img_array, request.preprocessing)
                else:
                    result = extract_text_tesseract(img_array, request.language, request.preprocessing)
                
                final_text = result["text"]
                avg_confidence = result["confidence"]
                pages_data = [{
                    "page_number": 1,
                    "text": final_text,
                    "confidence": avg_confidence,
                    "word_count": result["word_count"]
                }]
            
            # Detect language if text is available
            try:
                detected_language = detect(final_text) if final_text.strip() else request.language
            except:
                detected_language = request.language
            
            processing_time = time.time() - start_time
            
            ocr_result = OCRResult(
                text=final_text,
                confidence=avg_confidence,
                language=detected_language,
                pages=pages_data,
                processing_time=processing_time,
                engine=request.engine
            )
            
            return ocr_result
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ocr",
        "version": "1.0.0",
        "engines": ["tesseract", "easyocr"]
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Aura OCR Service",
        "version": "1.0.0",
        "endpoints": {
            "extract": "/extract",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )