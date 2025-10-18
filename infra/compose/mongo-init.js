// MongoDB initialization script
db = db.getSiblingDB('aura-app');

// Create collections
db.createCollection('users');
db.createCollection('documents');
db.createCollection('jobs');
db.createCollection('templates');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.documents.createIndex({ userId: 1 });
db.documents.createIndex({ status: 1 });
db.documents.createIndex({ createdAt: -1 });
db.documents.createIndex({ "processingResults.nlp.keywords": 1 });
db.documents.createIndex({ tags: 1 });

db.jobs.createIndex({ documentId: 1 });
db.jobs.createIndex({ userId: 1 });
db.jobs.createIndex({ status: 1 });
db.jobs.createIndex({ type: 1 });
db.jobs.createIndex({ createdAt: -1 });

db.templates.createIndex({ name: 1 }, { unique: true });
db.templates.createIndex({ createdBy: 1 });
db.templates.createIndex({ isActive: 1 });

// Insert default admin user (password will be hashed by the application)
db.users.insertOne({
  email: 'admin@aura-app.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  permissions: ['*'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert default templates
db.templates.insertMany([
  {
    name: 'Invoice Template',
    description: 'Standard invoice processing template',
    fields: [
      { name: 'invoiceNumber', type: 'string', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'total', type: 'number', required: true },
      { name: 'vendor', type: 'string', required: true },
      { name: 'items', type: 'array', required: false }
    ],
    createdBy: db.users.findOne({ email: 'admin@aura-app.com' })._id,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Contract Template',
    description: 'Legal contract processing template',
    fields: [
      { name: 'contractNumber', type: 'string', required: true },
      { name: 'parties', type: 'array', required: true },
      { name: 'effectiveDate', type: 'date', required: true },
      { name: 'expirationDate', type: 'date', required: false },
      { name: 'terms', type: 'text', required: true }
    ],
    createdBy: db.users.findOne({ email: 'admin@aura-app.com' })._id,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('Database initialized successfully!');