-- =========================================================
-- QUICKLINE HOMES
-- PostgreSQL Database Schema
-- =========================================================

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'landlord', 'tenant')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    role_id INTEGER NOT NULL
        REFERENCES roles(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description)
VALUES
('admin', 'Platform administrator'),
('landlord', 'Property owner or investor'),
('tenant', 'Rental property tenant'),
('agent', 'Property management agent'),
('staff', 'Company staff')
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- ADMIN ↔ LANDLORD ASSIGNMENTS
-- Allows an admin to manage selected landlords
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_landlord_assignments (
    id SERIAL PRIMARY KEY,

    admin_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    landlord_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(admin_id, landlord_id)
);

CREATE TABLE IF NOT EXISTS landlords (
    id SERIAL PRIMARY KEY,

    user_id INTEGER UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    company_name VARCHAR(255),

    national_id VARCHAR(100),

    address TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- =========================================================
-- PROPERTIES
-- =========================================================

CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,

    landlord_id INTEGER
        REFERENCES landlords(id) ON DELETE SET NULL,

    name VARCHAR(255) NOT NULL,

    property_type VARCHAR(50)
        CHECK (
            property_type IN (
                'apartment',
                'house',
                'villa',
                'commercial',
                'office',
                'mall',
                'hostel',
                'warehouse',
                'land',
                'other'
            )
        ),

    description TEXT,

    address TEXT,
    city VARCHAR(100),
    county VARCHAR(100),

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    status VARCHAR(30) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'under_construction', 'sold')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PROPERTY UNITS
-- =========================================================

CREATE TABLE IF NOT EXISTS property_units (
    id SERIAL PRIMARY KEY,

    property_id INTEGER NOT NULL
        REFERENCES properties(id) ON DELETE CASCADE,

    unit_number VARCHAR(100) NOT NULL,

    unit_type VARCHAR(50),

    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,

    monthly_rent NUMERIC(12,2) DEFAULT 0,
    security_deposit NUMERIC(12,2) DEFAULT 0,

    status VARCHAR(30) DEFAULT 'vacant'
        CHECK (
            status IN (
                'vacant',
                'occupied',
                'reserved',
                'maintenance',
                'unavailable'
            )
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(property_id, unit_number)
);

CREATE TABLE IF NOT EXISTS property_images (
    id SERIAL PRIMARY KEY,

    property_id INTEGER NOT NULL
        REFERENCES properties(id) ON DELETE CASCADE,

    image_url TEXT NOT NULL,

    is_primary BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,

    user_id INTEGER UNIQUE
        REFERENCES users(id) ON DELETE SET NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(255),
    phone VARCHAR(30),

    national_id VARCHAR(100),

    date_of_birth DATE,

    occupation VARCHAR(150),

    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(30),

    address TEXT,

    screening_status VARCHAR(30) DEFAULT 'pending'
        CHECK (
            screening_status IN (
                'pending',
                'approved',
                'rejected',
                'under_review'
            )
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- LEASES
-- =========================================================

CREATE TABLE IF NOT EXISTS leases (
    id SERIAL PRIMARY KEY,

    tenant_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    unit_id INTEGER NOT NULL
        REFERENCES property_units(id)
        ON DELETE CASCADE,

    start_date DATE NOT NULL,

    end_date DATE,

    monthly_rent DECIMAL(12, 2) NOT NULL,

    deposit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'pending',
                'active',
                'expired',
                'terminated'
            )
        ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_date IS NULL OR end_date >= start_date)
);


-- =========================================================
-- RENT PAYMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS rent_payments (
    id SERIAL PRIMARY KEY,

    tenant_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

    lease_id INTEGER
        REFERENCES leases(id)
        ON DELETE SET NULL,

    amount DECIMAL(12, 2) NOT NULL,

    payment_method VARCHAR(30) NOT NULL,

    transaction_reference VARCHAR(255),

    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'completed',
                'failed',
                'reversed'
            )
        ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,

    user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    tenant_id INTEGER
        REFERENCES tenants(id) ON DELETE SET NULL,

    landlord_id INTEGER
        REFERENCES landlords(id) ON DELETE SET NULL,

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

    payment_method VARCHAR(50)
        CHECK (
            payment_method IN (
                'mpesa',
                'card',
                'paypal',
                'bank',
                'cash',
                'other'
            )
        ),

    status VARCHAR(30) DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing',
                'completed',
                'failed',
                'cancelled',
                'refunded'
            )
        ),

    reference VARCHAR(150),

    description TEXT,

    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,

    payment_id INTEGER
        REFERENCES payments(id) ON DELETE CASCADE,

    charge_id INTEGER
        REFERENCES charges(id) ON DELETE SET NULL,

    amount NUMERIC(12,2) NOT NULL,

    transaction_reference VARCHAR(200),

    provider VARCHAR(50),

    provider_transaction_id VARCHAR(200),

    status VARCHAR(30) DEFAULT 'pending',

    response_code VARCHAR(50),

    response_message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- MPESA TRANSACTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id SERIAL PRIMARY KEY,

    payment_id INTEGER
        REFERENCES payments(id) ON DELETE SET NULL,

    checkout_request_id VARCHAR(200),

    merchant_request_id VARCHAR(200),

    mpesa_receipt_number VARCHAR(100),

    phone_number VARCHAR(30),

    amount NUMERIC(12,2),

    transaction_date TIMESTAMP,

    result_code VARCHAR(50),

    result_description TEXT,

    status VARCHAR(30) DEFAULT 'initiated'
        CHECK (
            status IN (
                'initiated',
                'pending',
                'completed',
                'failed',
                'cancelled'
            )
        ),

    raw_callback JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- MAINTENANCE REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,

    tenant_id INTEGER
        REFERENCES tenants(id) ON DELETE SET NULL,

    landlord_id INTEGER
        REFERENCES landlords(id) ON DELETE SET NULL,

    property_id INTEGER
        REFERENCES properties(id) ON DELETE SET NULL,

    unit_id INTEGER
        REFERENCES property_units(id) ON DELETE SET NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    priority VARCHAR(30) DEFAULT 'normal'
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        ),

    status VARCHAR(30) DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'assigned',
                'in_progress',
                'completed',
                'cancelled'
            )
        ),

    estimated_cost NUMERIC(12,2) DEFAULT 0,

    actual_cost NUMERIC(12,2) DEFAULT 0,

    charge_tenant BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_updates (
    id SERIAL PRIMARY KEY,

    maintenance_request_id INTEGER NOT NULL
        REFERENCES maintenance_requests(id) ON DELETE CASCADE,

    user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    message TEXT NOT NULL,

    status VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    plan_id INTEGER
        REFERENCES subscription_plans(id) ON DELETE SET NULL,

    plan_name VARCHAR(100),

    amount NUMERIC(12,2) DEFAULT 0,

    status VARCHAR(30) DEFAULT 'active'
        CHECK (
            status IN (
                'pending',
                'active',
                'expired',
                'cancelled'
            )
        ),

    start_date DATE,
    end_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    price NUMERIC(12,2) DEFAULT 0,

    duration_days INTEGER DEFAULT 30,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS charge_types (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    default_amount NUMERIC(12,2) DEFAULT 0,

    payer_type VARCHAR(30)
        CHECK (
            payer_type IN (
                'tenant',
                'landlord',
                'customer',
                'company'
            )
        ),

    is_recurring BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO charge_types
(name, description, default_amount, payer_type, is_recurring)
VALUES
('Rent', 'Monthly rental payment', 0, 'tenant', TRUE),

('Security Deposit', 'Property security deposit', 0, 'tenant', FALSE),

('Application Fee', 'Rental application processing fee', 0, 'tenant', FALSE),

('Viewing Fee', 'Property viewing fee', 0, 'tenant', FALSE),

('Late Payment Fee', 'Charge for late rent payment', 0, 'tenant', FALSE),

('Maintenance Fee', 'Maintenance or repair charge', 0, 'tenant', FALSE),

('Property Management Fee', 'Property management service fee', 0, 'landlord', TRUE),

('Property Listing Fee', 'Property marketing/listing fee', 0, 'landlord', FALSE),

('Property Valuation Fee', 'Property valuation service charge', 0, 'landlord', FALSE),

('Lease Processing Fee', 'Lease and contract processing fee', 0, 'tenant', FALSE),

('Inspection Fee', 'Property inspection fee', 0, 'customer', FALSE),

('Project Management Fee', 'Real estate project management charge', 0, 'landlord', FALSE),

('Payment Processing Fee', 'Payment processing charge', 0, 'customer', FALSE),

('Other Service Fee', 'Other company service charge', 0, 'customer', FALSE)

ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS charges (
    id SERIAL PRIMARY KEY,

    charge_type_id INTEGER NOT NULL
        REFERENCES charge_types(id) ON DELETE RESTRICT,

    tenant_id INTEGER
        REFERENCES tenants(id) ON DELETE SET NULL,

    landlord_id INTEGER
        REFERENCES landlords(id) ON DELETE SET NULL,

    property_id INTEGER
        REFERENCES properties(id) ON DELETE SET NULL,

    unit_id INTEGER
        REFERENCES property_units(id) ON DELETE SET NULL,

    lease_id INTEGER
        REFERENCES leases(id) ON DELETE SET NULL,

    description TEXT,

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount >= 0),

    amount_paid NUMERIC(12,2) DEFAULT 0
        CHECK (amount_paid >= 0),

    balance NUMERIC(12,2)
        GENERATED ALWAYS AS (amount - amount_paid) STORED,

    due_date DATE,

    status VARCHAR(30) DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'partially_paid',
                'paid',
                'overdue',
                'cancelled'
            )
        ),

    reference_number VARCHAR(100) UNIQUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE charges
ADD COLUMN IF NOT EXISTS billing_period DATE;


CREATE TABLE IF NOT EXISTS charge_items (
    id SERIAL PRIMARY KEY,

    charge_id INTEGER NOT NULL
        REFERENCES charges(id) ON DELETE CASCADE,

    description TEXT NOT NULL,

    quantity NUMERIC(12,2) DEFAULT 1,

    unit_price NUMERIC(12,2) NOT NULL,

    total NUMERIC(12,2)
        GENERATED ALWAYS AS (quantity * unit_price) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    type VARCHAR(50),

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    expires_at TIMESTAMP NOT NULL,

    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100),

    entity_id INTEGER,

    old_values JSONB,

    new_values JSONB,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,

    payment_id INTEGER NOT NULL
        REFERENCES payments(id) ON DELETE CASCADE,

    receipt_number VARCHAR(100) UNIQUE NOT NULL,

    issued_to VARCHAR(255),

    amount NUMERIC(12,2) NOT NULL,

    receipt_url TEXT,

    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_phone
ON users(phone);

CREATE INDEX IF NOT EXISTS idx_properties_landlord
ON properties(landlord_id);

CREATE INDEX IF NOT EXISTS idx_properties_city
ON properties(city);

CREATE INDEX IF NOT EXISTS idx_units_property
ON property_units(property_id);

CREATE INDEX IF NOT EXISTS idx_units_status
ON property_units(status);

CREATE INDEX IF NOT EXISTS idx_tenants_user
ON tenants(user_id);

CREATE INDEX IF NOT EXISTS idx_leases_tenant
ON leases(tenant_id);

CREATE INDEX IF NOT EXISTS idx_leases_unit
ON leases(unit_id);

CREATE INDEX IF NOT EXISTS idx_charges_tenant
ON charges(tenant_id);

CREATE INDEX IF NOT EXISTS idx_charges_landlord
ON charges(landlord_id);

CREATE INDEX IF NOT EXISTS idx_charges_status
ON charges(status);

CREATE INDEX IF NOT EXISTS idx_charges_due_date
ON charges(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_user
ON payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

CREATE INDEX IF NOT EXISTS idx_mpesa_checkout
ON mpesa_transactions(checkout_request_id);

CREATE INDEX IF NOT EXISTS idx_mpesa_receipt
ON mpesa_transactions(mpesa_receipt_number);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_mpesa_receipt_unique
ON mpesa_transactions(mpesa_receipt_number)
WHERE mpesa_receipt_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS
idx_mpesa_payment
ON mpesa_transactions(payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_unique_rent_billing
ON charges (
    lease_id,
    charge_type_id,
    billing_period
)
WHERE lease_id IS NOT NULL
AND charge_type_id IS NOT NULL
AND billing_period IS NOT NULL;