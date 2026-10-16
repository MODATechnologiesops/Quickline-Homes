CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    service_key VARCHAR(80) NOT NULL,
    service_name VARCHAR(160) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    service_date DATE NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    details TEXT,
    admin_price NUMERIC(12, 2) CHECK (admin_price IS NULL OR admin_price > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'booked', 'completed', 'cancelled')),
    priced_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (status = 'requested' AND admin_price IS NULL)
        OR (status IN ('booked', 'completed') AND admin_price IS NOT NULL)
        OR status = 'cancelled'
    )
);

CREATE INDEX IF NOT EXISTS service_requests_status_date
    ON service_requests (status, service_date, created_at DESC);
