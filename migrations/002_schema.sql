-- Enhanced Database Schema for Agentic Trades Voice Agent
-- Aligned with business plan requirements for HVAC/trades operations

-- Core customer management with business intelligence
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  address_json JSONB NOT NULL, -- Enhanced for geolocation and service radius
  billing_address_json JSONB,
  customer_type TEXT CHECK (customer_type IN ('residential', 'commercial', 'property_manager')) DEFAULT 'residential',
  membership_level TEXT CHECK (membership_level IN ('none', 'basic', 'premium')) DEFAULT 'none',
  membership_expires_at TIMESTAMPTZ,
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  acquisition_source TEXT, -- 'voice_agent', 'referral', 'google_ads', etc.
  service_notes TEXT, -- Access instructions, pets, special requirements
  credit_status TEXT CHECK (credit_status IN ('good', 'hold', 'collections')) DEFAULT 'good',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job sequence for human-readable job numbers
CREATE SEQUENCE IF NOT EXISTS job_sequence START 1000;

-- Enhanced jobs table for comprehensive service tracking
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL DEFAULT 'J' || extract(year from now()) || '-' || LPAD(nextval('job_sequence')::text, 6, '0'),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Service details
  svc_type TEXT CHECK (svc_type IN ('HVAC', 'Plumbing', 'Electrical', 'Maintenance', 'Emergency')) NOT NULL,
  category TEXT CHECK (category IN ('diagnostic', 'repair', 'installation', 'maintenance', 'emergency')),
  description TEXT NOT NULL,
  urgency TEXT CHECK (urgency IN ('routine', 'urgent', 'emergency')) DEFAULT 'routine',
  
  -- Scheduling
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  preferred_tech_id UUID, -- Reference to technicians table
  actual_arrival TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  
  -- Status tracking
  status TEXT CHECK (status IN ('scheduled', 'confirmed', 'en_route', 'in_progress', 'completed', 'canceled', 'no_show')) DEFAULT 'scheduled',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'emergency')) DEFAULT 'normal',
  
  -- Financial
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
  
  -- Business intelligence
  source TEXT NOT NULL, -- 'voice_agent', 'manual', 'online_booking', etc.
  booking_channel TEXT, -- More specific than source
  lead_time_hours INTEGER, -- Hours between booking and service
  is_after_hours BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  
  -- Compliance and quality
  photos_required BOOLEAN DEFAULT false,
  license_required TEXT[], -- Array of required licenses
  equipment_needed TEXT[],
  parts_estimate_json JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_time_window CHECK (window_end > window_start)
);

-- Enhanced call tracking for business metrics
CREATE TABLE IF NOT EXISTS calls (
  call_sid TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  
  -- Call classification
  channel TEXT CHECK (channel IN ('PSTN', 'WebRTC', 'WhatsApp', 'SMS')) NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound',
  caller_number TEXT,
  
  -- Business outcomes
  outcome TEXT CHECK (outcome IN ('booking_created', 'information_only', 'escalated', 'abandoned', 'no_answer', 'busy')),
  intent_detected TEXT[], -- Array of detected intents
  booking_created BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  
  -- Quality metrics
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  call_quality TEXT CHECK (call_quality IN ('excellent', 'good', 'fair', 'poor')),
  
  -- Technical metrics
  total_duration_seconds INTEGER,
  talk_time_seconds INTEGER,
  hold_time_seconds INTEGER,
  first_response_latency_ms INTEGER,
  
  -- Content and compliance
  transcript_s3_url TEXT,
  recording_s3_url TEXT,
  language_detected TEXT DEFAULT 'en-US',
  compliance_flags TEXT[], -- TCPA violations, missing disclosures, etc.
  
  -- Business context
  business_hours BOOLEAN,
  holiday BOOLEAN DEFAULT false,
  weather_factor TEXT, -- For emergency correlations
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detailed turn-by-turn conversation tracking
CREATE TABLE IF NOT EXISTS agent_turns (
  id BIGSERIAL PRIMARY KEY,
  call_sid TEXT REFERENCES calls(call_sid) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  
  -- Turn details
  timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  message_text TEXT,
  
  -- AI performance metrics
  confidence_score DECIMAL(4,3), -- ASR confidence
  intent_classification TEXT,
  sentiment_detected TEXT,
  latency_ms INTEGER,
  
  -- Tool usage
  tool_calls_json JSONB, -- Array of tool calls made
  tool_success BOOLEAN,
  tool_error_message TEXT,
  
  -- Quality flags
  interruption BOOLEAN DEFAULT false,
  repeat_request BOOLEAN DEFAULT false,
  clarification_needed BOOLEAN DEFAULT false,
  
  UNIQUE(call_sid, turn_number)
);

-- Pricing and quotes tracking
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  call_sid TEXT REFERENCES calls(call_sid),
  
  -- Quote details
  service_call_fee DECIMAL(8,2),
  labor_cost DECIMAL(8,2),
  parts_cost DECIMAL(8,2),
  total_estimate DECIMAL(8,2),
  
  -- Pricing factors
  base_rate DECIMAL(8,2),
  emergency_multiplier DECIMAL(3,2) DEFAULT 1.0,
  after_hours_fee DECIMAL(8,2) DEFAULT 0,
  membership_discount DECIMAL(8,2) DEFAULT 0,
  
  -- Quote metadata
  valid_until TIMESTAMPTZ,
  quote_source TEXT DEFAULT 'voice_agent',
  complexity_factor DECIMAL(3,2) DEFAULT 1.0,
  competitive_adjustment DECIMAL(8,2) DEFAULT 0,
  
  -- Acceptance tracking
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technician management and dispatch optimization
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Skills and certifications
  specialties TEXT[] NOT NULL, -- HVAC, Plumbing, Electrical
  certifications JSONB, -- License numbers, expiration dates
  skill_level TEXT CHECK (skill_level IN ('apprentice', 'journeyman', 'master')) NOT NULL,
  
  -- Scheduling
  status TEXT CHECK (status IN ('available', 'busy', 'off_duty', 'on_call')) DEFAULT 'available',
  current_location geometry(Point, 4326), -- switched to geometry type
  service_radius_miles INTEGER DEFAULT 25,
  
  -- Performance metrics
  completion_rate DECIMAL(4,3) DEFAULT 1.0,
  customer_rating DECIMAL(3,2) DEFAULT 5.0,
  average_job_time_minutes INTEGER,
  no_show_rate DECIMAL(4,3) DEFAULT 0.0,
  
  -- Financial
  hourly_rate DECIMAL(6,2),
  commission_rate DECIMAL(4,3),
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service area and territory management
CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  boundary geometry(Polygon, 4326) NOT NULL, -- Geographic boundary
  zip_codes TEXT[] NOT NULL,
  
  -- Business rules
  service_fee DECIMAL(8,2) DEFAULT 0, -- Travel fee
  priority INTEGER DEFAULT 1, -- 1 = primary territory
  after_hours_available BOOLEAN DEFAULT true,
  emergency_available BOOLEAN DEFAULT true,
  
  -- Assigned technicians
  primary_tech_ids UUID[] DEFAULT '{}',
  backup_tech_ids UUID[] DEFAULT '{}',
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipment and parts inventory integration
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- filters, thermostats, motors, etc.
  
  -- Inventory tracking
  current_stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  max_stock_level INTEGER DEFAULT 100,
  reorder_point INTEGER DEFAULT 10,
  
  -- Pricing
  cost_price DECIMAL(10,2),
  markup_percentage DECIMAL(5,2) DEFAULT 100.0,
  retail_price DECIMAL(10,2),
  
  -- Technical specs
  specifications JSONB,
  compatibility TEXT[], -- What systems this works with
  warranty_months INTEGER DEFAULT 12,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment and billing integration
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('deposit', 'partial', 'full', 'refund')) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('card', 'ach', 'cash', 'check', 'financing')) NOT NULL,
  
  -- External references
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  check_number TEXT,
  
  -- Status and timing
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Metadata
  fees_collected DECIMAL(8,2) DEFAULT 0,
  net_amount DECIMAL(10,2), -- Amount after fees
  processor_fee DECIMAL(8,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer communication log
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Communication details
  channel TEXT CHECK (channel IN ('voice', 'sms', 'email', 'in_person')) NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  subject TEXT,
  message_body TEXT,
  
  -- Status tracking
  status TEXT CHECK (status IN ('sent', 'delivered', 'read', 'responded', 'failed')) DEFAULT 'sent',
  response_required BOOLEAN DEFAULT false,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  
  -- External references
  twilio_message_sid TEXT,
  email_message_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ, -- For scheduled communications
  sent_at TIMESTAMPTZ
);

-- Business analytics and KPI tracking
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  
  -- Call metrics
  total_calls INTEGER DEFAULT 0,
  answered_calls INTEGER DEFAULT 0,
  missed_calls INTEGER DEFAULT 0,
  answer_rate DECIMAL(5,4), -- Percentage as decimal
  
  -- Booking metrics  
  bookings_created INTEGER DEFAULT 0,
  booking_conversion_rate DECIMAL(5,4),
  average_booking_value DECIMAL(10,2),
  
  -- Service metrics
  jobs_completed INTEGER DEFAULT 0,
  jobs_canceled INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,4),
  
  -- Financial metrics
  gross_revenue DECIMAL(12,2),
  deposits_collected DECIMAL(10,2),
  outstanding_ar DECIMAL(10,2),
  
  -- Quality metrics
  average_response_time_seconds INTEGER,
  customer_satisfaction DECIMAL(3,2),
  first_time_fix_rate DECIMAL(5,4),
  
  -- Channel attribution
  voice_agent_bookings INTEGER DEFAULT 0,
  human_bookings INTEGER DEFAULT 0,
  online_bookings INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(metric_date)
);

-- System configuration for business rules
CREATE TABLE IF NOT EXISTS business_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  
  -- Validation
  data_type TEXT CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array')) NOT NULL,
  validation_rules JSONB, -- JSON schema for validation
  
  -- Metadata
  category TEXT NOT NULL, -- pricing, scheduling, compliance, etc.
  is_sensitive BOOLEAN DEFAULT false, -- For secrets/API keys
  last_modified_by TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_membership ON customers(membership_level) WHERE membership_level != 'none';

CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_schedule ON jobs(window_start, window_end) WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_source_channel ON jobs(source, booking_channel);
CREATE INDEX IF NOT EXISTS idx_jobs_emergency ON jobs(priority, urgency) WHERE priority = 'emergency';

CREATE INDEX IF NOT EXISTS idx_calls_outcome ON calls(outcome, started_at);
CREATE INDEX IF NOT EXISTS idx_calls_business_hours ON calls(business_hours, started_at);
CREATE INDEX IF NOT EXISTS idx_calls_booking_created ON calls(booking_created) WHERE booking_created = true;

CREATE INDEX IF NOT EXISTS idx_agent_turns_call_turn ON agent_turns(call_sid, turn_number);
CREATE INDEX IF NOT EXISTS idx_agent_turns_latency ON agent_turns(latency_ms) WHERE latency_ms > 1000;

CREATE INDEX IF NOT EXISTS idx_technicians_status_specialty ON technicians(status, specialties) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_technicians_location ON technicians USING GIST(current_location) WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communications_customer_channel ON communications(customer_id, channel, created_at);
CREATE INDEX IF NOT EXISTS idx_communications_job_pending ON communications(job_id) WHERE response_required = true;

-- Insert default business configuration
INSERT INTO business_config (config_key, config_value, description, data_type, category) VALUES
('business_hours', '{"start": 8, "end": 18, "timezone": "America/New_York"}', 'Standard business operating hours', 'object', 'scheduling'),
('service_radius_miles', '25', 'Maximum service radius from main location', 'number', 'service_area'),
('emergency_keywords', '["gas leak", "smoke", "carbon monoxide", "no heat", "no cooling", "flood", "electrical fire"]', 'Keywords that trigger emergency protocols', 'array', 'safety'),
('pricing_hvac_diagnostic', '{"min": 150, "max": 250, "avg": 200}', 'HVAC diagnostic service pricing', 'object', 'pricing'),
('pricing_hvac_repair', '{"min": 300, "max": 800, "avg": 550}', 'HVAC repair service pricing', 'object', 'pricing'),
('pricing_emergency_multiplier', '1.5', 'After-hours and emergency service multiplier', 'number', 'pricing'),
('membership_basic', '{"monthly_fee": 29.99, "discount_percentage": 10, "priority_booking": false}', 'Basic membership tier benefits', 'object', 'membership'),
('membership_premium', '{"monthly_fee": 59.99, "discount_percentage": 15, "priority_booking": true}', 'Premium membership tier benefits', 'object', 'membership'),
('deposit_percentage', '0.25', 'Default deposit percentage of estimated job cost', 'number', 'financial'),
('minimum_deposit', '50.00', 'Minimum deposit amount regardless of job size', 'number', 'financial'),
('compliance_recording_required', 'true', 'Whether call recording disclosure is required', 'boolean', 'compliance'),
('voice_agent_languages', '["en-US", "es-US"]', 'Supported languages for voice agent', 'array', 'voice_agent'),
('booking_lead_time_hours', '24', 'Minimum hours between booking and service for non-emergency', 'number', 'scheduling')
ON CONFLICT (config_key) DO NOTHING;

-- Functions for business intelligence
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $
DECLARE
    call_stats RECORD;
    booking_stats RECORD;
    financial_stats RECORD;
BEGIN
    -- Calculate call metrics
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome != 'no_answer' AND outcome != 'abandoned') as answered,
        COUNT(*) FILTER (WHERE outcome = 'no_answer' OR outcome = 'abandoned') as missed
    INTO call_stats
    FROM calls 
    WHERE DATE(started_at) = target_date;
    
    -- Calculate booking metrics
    SELECT 
        COUNT(*) as created,
        AVG(estimated_cost) as avg_value
    INTO booking_stats
    FROM jobs 
    WHERE DATE(created_at) = target_date AND source = 'voice_agent';
    
    -- Calculate financial metrics
    SELECT 
        COALESCE(SUM(p.amount), 0) as deposits,
        COALESCE(SUM(j.estimated_cost), 0) as gross_revenue
    INTO financial_stats
    FROM jobs j
    LEFT JOIN payments p ON j.id = p.job_id AND p.payment_type = 'deposit' AND p.status = 'completed'
    WHERE DATE(j.created_at) = target_date;
    
    -- Insert or update metrics
    INSERT INTO business_metrics (
        metric_date, total_calls, answered_calls, missed_calls, answer_rate,
        bookings_created, booking_conversion_rate, average_booking_value,
        gross_revenue, deposits_collected, voice_agent_bookings
    ) VALUES (
        target_date,
        call_stats.total,
        call_stats.answered,
        call_stats.missed,
        CASE WHEN call_stats.total > 0 THEN call_stats.answered::DECIMAL / call_stats.total ELSE 0 END,
        booking_stats.created,
        CASE WHEN call_stats.answered > 0 THEN booking_stats.created::DECIMAL / call_stats.answered ELSE 0 END,
        booking_stats.avg_value,
        financial_stats.gross_revenue,
        financial_stats.deposits,
        booking_stats.created
    ) ON CONFLICT (metric_date) DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        answered_calls = EXCLUDED.answered_calls,
        missed_calls = EXCLUDED.missed_calls,
        answer_rate = EXCLUDED.answer_rate,
        bookings_created = EXCLUDED.bookings_created,
        booking_conversion_rate = EXCLUDED.booking_conversion_rate,
        average_booking_value = EXCLUDED.average_booking_value,
        gross_revenue = EXCLUDED.gross_revenue,
        deposits_collected = EXCLUDED.deposits_collected,
        voice_agent_bookings = EXCLUDED.voice_agent_bookings;
END;
$ LANGUAGE plpgsql;

-- Trigger to auto-update customer lifetime value
CREATE OR REPLACE FUNCTION update_customer_ltv()
RETURNS TRIGGER AS $
BEGIN
    UPDATE customers SET 
        lifetime_value = (
            SELECT COALESCE(SUM(actual_cost), 0) 
            FROM jobs 
            WHERE customer_id = NEW.customer_id AND status = 'completed'
        ),
        updated_at = now()
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_ltv
    AFTER INSERT OR UPDATE OF actual_cost, status ON jobs
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND NEW.actual_cost IS NOT NULL)
    EXECUTE FUNCTION update_customer_ltv();

-- View for real-time business dashboard
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    -- Today's metrics
    (SELECT COUNT(*) FROM calls WHERE DATE(started_at) = CURRENT_DATE) as calls_today,
    (SELECT COUNT(*) FROM calls WHERE DATE(started_at) = CURRENT_DATE AND booking_created = true) as bookings_today,
    (SELECT COUNT(*) FROM jobs WHERE DATE(window_start) = CURRENT_DATE AND status IN ('scheduled', 'confirmed')) as jobs_scheduled_today,
    (SELECT COUNT(*) FROM jobs WHERE status = 'in_progress') as jobs_in_progress,
    
    -- This week's performance
    (SELECT COUNT(*) FROM jobs WHERE created_at >= date_trunc('week', CURRENT_DATE) AND source = 'voice_agent') as voice_bookings_this_week,
    (SELECT AVG(estimated_cost) FROM jobs WHERE created_at >= date_trunc('week', CURRENT_DATE)) as avg_job_value_this_week,
    
    -- Operational status
    (SELECT COUNT(*) FROM technicians WHERE status = 'available' AND active = true) as available_technicians,
    (SELECT COUNT(*) FROM jobs WHERE window_start BETWEEN now() AND now() + interval '24 hours' AND status IN ('scheduled', 'confirmed')) as jobs_next_24h,
    
    -- Key performance indicators
    (SELECT answer_rate FROM business_metrics WHERE metric_date = CURRENT_DATE - interval '1 day') as yesterday_answer_rate,
    (SELECT booking_conversion_rate FROM business_metrics WHERE metric_date = CURRENT_DATE - interval '1 day') as yesterday_conversion_rate;

-- Sample data for testing (optional)
INSERT INTO customers (name, phone_e164, email, address_json, customer_type, acquisition_source) VALUES
('John Smith', '+15551234567', 'john.smith@email.com', '{"street": "123 Oak Street", "city": "Springfield", "state": "OH", "zip": "45503", "coordinates": {"lat": 39.9242, "lon": -83.8088}}', 'residential', 'voice_agent'),
('Jane Doe', '+15559876543', 'jane.doe@email.com', '{"street": "456 Elm Avenue", "city": "Springfield", "state": "OH", "zip": "45504", "coordinates": {"lat": 39.9312, "lon": -83.8158}}', 'residential', 'referral')
ON CONFLICT (phone_e164) DO NOTHING;
