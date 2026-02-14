-- Fake Dealership Data Generator
-- 1 dealership, 3 locations, 59 vehicles

-- Drop tables if exists (for fresh setup)
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS dealer_locations CASCADE;
DROP TABLE IF EXISTS dealers CASCADE;

-- Dealers Table
CREATE TABLE dealers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    website_url VARCHAR(500),
    business_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dealer Locations Table
CREATE TABLE dealer_locations (
    id BIGSERIAL PRIMARY KEY,
    dealer_id BIGINT REFERENCES dealers(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    UNIQUE(dealer_id, name),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table
CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    vin VARCHAR(17) UNIQUE,
    year INTEGER,
    make VARCHAR(100),
    model VARCHAR(100),
    trim VARCHAR(100),
    price DECIMAL(10, 2),
    mileage INTEGER,
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    body_type VARCHAR(50),
    transmission VARCHAR(50),
    drivetrain VARCHAR(50),
    fuel_type VARCHAR(20),
    engine VARCHAR(100),
    engine_cylinders VARCHAR(20),
    engine_displacement VARCHAR(50),
    horsepower INTEGER,
    mpg_city INTEGER,
    mpg_highway INTEGER,
    
    -- Dealer references
    dealer_id BIGINT REFERENCES dealers(id) ON DELETE CASCADE,
    location_id BIGINT REFERENCES dealer_locations(id) ON DELETE SET NULL,
    
    -- Metadata
    availability BOOLEAN DEFAULT true,
    condition VARCHAR(50),
    stock_number VARCHAR(100),
    title_status VARCHAR(50),
    
    -- Description
    description TEXT,
    
    -- Images & Features (JSON)
    features TEXT,
    images TEXT,
    
    -- Quality & Metadata
    quality_score INTEGER DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
    source VARCHAR(100) DEFAULT 'placeholder',
    url TEXT,
    
    -- Timestamps
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast filtering
CREATE INDEX idx_price ON vehicles(price);
CREATE INDEX idx_year ON vehicles(year);
CREATE INDEX idx_make_model ON vehicles(make, model);
CREATE INDEX idx_dealer ON vehicles(dealer_id);
CREATE INDEX idx_location ON vehicles(location_id);
CREATE INDEX idx_availability ON vehicles(availability);
CREATE INDEX idx_quality ON vehicles(quality_score);
CREATE INDEX idx_stock ON vehicles(stock_number);
CREATE INDEX idx_url ON vehicles(url);
CREATE INDEX idx_dealer_url ON vehicles(dealer_id, url);
CREATE UNIQUE INDEX idx_unique_dealer_stock
ON vehicles(dealer_id, stock_number)
WHERE stock_number IS NOT NULL;

-- Insert Fake Dealership
INSERT INTO dealers (name, website_url, business_id) VALUES
('Summit Automotive Group', 'https://www.summitautogroup.com', 'summit-auto');

-- Get dealer ID for locations
DO $$
DECLARE v_dealer_id BIGINT;
BEGIN
    SELECT id INTO v_dealer_id FROM dealers WHERE business_id = 'summit-auto';
    
    -- Insert 3 Locations
    INSERT INTO dealer_locations (dealer_id, name, address, city, state, zip, phone, latitude, longitude) VALUES
    (v_dealer_id, 'Summit Automotive - Denver', '1234 Speer Blvd', 'Denver', 'CO', '80204', '(303) 555-0101', 39.7392, -104.9903),
    (v_dealer_id, 'Summit Automotive - Aurora', '5678 S Peoria St', 'Aurora', 'CO', '80012', '(303) 555-0202', 39.7294, -104.8319),
    (v_dealer_id, 'Summit Automotive - Lakewood', '9101 W Colfax Ave', 'Lakewood', 'CO', '80215', '(303) 555-0303', 39.7341, -105.0762);
END $$;

-- Insert 59 Fake Vehicles
-- Realistic car data spread across 3 locations

INSERT INTO vehicles (
    vin, year, make, model, trim, price, mileage,
    exterior_color, interior_color, body_type, transmission, drivetrain, fuel_type,
    engine, engine_cylinders, engine_displacement, horsepower, mpg_city, mpg_highway,
    dealer_id, location_id, stock_number, condition, description, features, images,
    quality_score, availability
) VALUES
-- Location 1: Denver (22 cars) - Mix of makes/models
('1FTFW1E57MFA12345', 2021, 'Ford', 'F-150', 'XLT', 38995, 45200, 'Oxford White', 'Medium Stone', 'Pickup Truck', '10-Speed Automatic', '4WD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 400, 20, 24, 1, 1, 'DEN451234', 'Used', '2021 Ford F-150 XLT - Well-maintained fleet vehicle. Clean CarFax available. 4WD perfect for Colorado winters.', '["Towing Package", "Bed Liner", "Running Boards", "Backup Camera", "Bluetooth", "Cruise Control"]', '["https://example.com/f1.jpg", "https://example.com/f2.jpg", "https://example.com/f3.jpg"]', 92, true),
('2T1BURHE1GC112345', 2019, 'Toyota', 'RAV4', 'XLE', 26995, 38450, 'Celestial Silver Metallic', 'Black', 'SUV', '8-Speed Automatic', 'AWD', 'Gasoline', '2.5L I4', 'I4', '2.5L', 203, 28, 35, 1, 1, 'DEN234567', 'Used', '2019 Toyota RAV4 XLE - One owner, all service records at Toyota dealer. New tires at 35k miles.', '["Sunroof", "Leather Interior", "Heated Seats", "Navigation", "Apple CarPlay", "Android Auto"]', '["https://example.com/r1.jpg", "https://example.com/r2.jpg"]', 88, true),
('JM1BK3240L0123456', 2022, 'Mazda', 'CX-5', 'Grand Touring', 33495, 22100, 'Machine Gray Metallic', 'Parchment', 'SUV', '6-Speed Automatic', 'AWD', 'Gasoline', '2.5L I4', 'I4', '2.5L', 256, 25, 31, 1, 1, 'DEN345678', 'Used', '2022 Mazda CX-5 Grand Touring - Low mileage, excellent condition. Premium package with all features.', '["Bose Sound System", "Heated Steering Wheel", "Power Liftgate", "Blind Spot Monitoring", "Lane Keep Assist"]', '["https://example.com/m1.jpg", "https://example.com/m2.jpg", "https://example.com/m3.jpg"]', 95, true),
('1C4RJFBG9HC890123', 2017, 'Jeep', 'Grand Cherokee', 'Trailhawk', 34500, 56780, 'Velvet Red Pearlcoat', 'Black', 'SUV', '9-Speed Automatic', '4WD', 'Gasoline', '3.6L V6', 'V6', '3.6L', 295, 18, 26, 1, 1, 'DEN456789', 'Used', '2017 Jeep Grand Cherokee Trailhawk - Off-road ready with Quadra-Drive II 4WD system. Well-maintained.', '["Off-Road Package", "Tow Hooks", "Rock Rails", "Premium Audio", "Navigation"]', '["https://example.com/j1.jpg", "https://example.com/j2.jpg"]', 85, true),
('JF2SJAAC5KH123456', 2015, 'Subaru', 'Outback', 'Premium', 16995, 72340, 'Crystal White Pearl', 'Ivory', 'Wagon', 'Lineartronic CVT', 'AWD', 'Gasoline', '2.5L I4', 'I4', '2.5L', 175, 28, 33, 1, 1, 'DEN567890', 'Used', '2015 Subaru Outback Premium - High mileage but reliable. Colorado car, never seen salt. Recent timing belt service.', '["All-Weather Package", "Roof Rails", "EyeSight Safety", "Heated Seats"]', '["https://example.com/s1.jpg"]', 72, true),
('4T1BF3FK8DU234567', 2023, 'Toyota', 'Camry', 'SE', 26500, 8500, 'Celestial Silver Metallic', 'Fabric', 'Sedan', '8-Speed Automatic', 'FWD', 'Hybrid', '2.5L I4 Hybrid', 'I4', '2.5L', 208, 51, 53, 1, 1, 'DEN678901', 'Used', '2023 Toyota Camry SE - Like new! Still under factory warranty. Hybrid gets 53 MPG.', '["Toyota Safety Sense", "Push Button Start", "8-Inch Touchscreen", "Qi Wireless Charging"]', '["https://example.com/c1.jpg", "https://example.com/c2.jpg", "https://example.com/c3.jpg"]', 98, true),
('1F1F15W85KEF345678', 2014, 'Ford', 'Mustang', 'GT', 28995, 48900, 'Race Red', 'Black', 'Coupe', '6-Speed Manual', 'RWD', 'Gasoline', '5.0L V8', 'V8', '5.0L', 420, 15, 24, 1, 1, 'DEN789012', 'Used', '2014 Ford Mustang GT - Manual transmission, V8 power! Aftermarket exhaust and cold air intake. Well-cared for.', '["Brembo Brakes", "Recaro Seats", "Shaker Audio", "Performance Tires"]', '["https://example.com/must1.jpg", "https://example.com/must2.jpg"]', 80, true),
('5YJ3E1E8JF123456', 2020, 'Tesla', 'Model 3', 'Standard Range Plus', 32995, 34200, 'Solid Black', 'Black', 'Sedan', 'Single Speed', 'RWD', 'Electric', 'Electric Motor', 'N/A', 'N/A', 283, 148, 126, 1, 1, 'DEN890123', 'Used', '2020 Tesla Model 3 - Full Autopilot, premium interior. Supercharger access included.', '["Autopilot", "Premium Audio", "Premium Interior", "Supercharger Access"]', '["https://example.com/t1.jpg", "https://example.com/t2.jpg", "https://example.com/t3.jpg"]', 90, true),
('2HGFC3F53KH523456', 2019, 'Honda', 'Civic', 'Touring', 22995, 41500, 'Polished Metal Metallic', 'Gray', 'Sedan', 'CVT', 'FWD', 'Gasoline', '1.5L I4 Turbo', 'I4', '1.5L', 174, 32, 42, 1, 1, 'DEN901234', 'Used', '2019 Honda Civic Touring - Honda Sensing suite, heated leather seats. Excellent fuel economy.', '["Honda Sensing", "LaneWatch", "Apple CarPlay", "Android Auto", "Wireless Charging"]', '["https://example.com/civ1.jpg", "https://example.com/civ2.jpg"]', 89, true),
('1G1YY2D09K5123456', 2019, 'Chevrolet', 'Corvette', 'Stingray', 68995, 12400, 'Torch Red', 'Jet Black', 'Coupe', '8-Speed Automatic', 'RWD', 'Gasoline', '6.2L V8', 'V8', '6.2L', 495, 15, 29, 1, 1, 'DEN012345', 'Used', '2019 Chevrolet Corvette Stingray - Only 12k miles! Garage kept, perfect condition. Z51 Performance Package.', '["Z51 Performance Package", "Magnetic Ride Control", "Performance Exhaust", "Navigation"]', '["https://example.com/vet1.jpg", "https://example.com/vet2.jpg", "https://example.com/vet3.jpg"]', 94, true),
('KNDJP3A57H7123456', 2017, 'Kia', 'Sorento', 'SX', 21995, 62800, 'Snow White Pearl', 'Black', 'SUV', '6-Speed Automatic', 'FWD', 'Gasoline', '3.3L V6', 'V6', '3.3L', 290, 20, 27, 1, 1, 'DEN123456', 'Used', '2017 Kia Sorento SX - Third-row seating, family friendly. New tires at 60k.', '["Third Row Seating", "UVO Infotainment", "Power Liftgate", "Heated Second Row"]', '["https://example.com/k1.jpg"]', 78, true),
('1F1F15W86HEF456789', 2018, 'Ford', 'F-150', 'Lariat', 42995, 39800, 'Ingot Silver', 'Gray', 'Pickup Truck', '10-Speed Automatic', '4WD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 375, 19, 25, 1, 1, 'DEN234567', 'Used', '2018 Ford F-150 Lariat - Loaded with options. Spray-in bedliner, tonneau cover, remote start.', '["Lariat Package", "Leather Interior", "Bang & Olufsen Audio", "Remote Start"]', '["https://example.com/f1-2.jpg", "https://example.com/f2-2.jpg"]', 91, true),
('3FA6P0J71LR123456', 2015, 'Ford', 'Fusion', 'Titanium', 15495, 72340, 'White Platinum', 'Charcoal Black', 'Sedan', '6-Speed Automatic', 'FWD', 'Gasoline', '2.0L I4 EcoBoost', 'I4', '2.0L', 231, 22, 34, 1, 1, 'DEN345678', 'Used', '2015 Ford Fusion Titanium - High mileage but runs great. Recent service: new brakes, tires.', '["Titanium Package", "Sony Audio", "Heated Seats", "Dual-Zone Climate"]', '["https://example.com/fus1.jpg"]', 65, true),
('1G1YE2D54KF123456', 2016, 'Chevrolet', 'Silverado', 'LTZ', 35995, 54300, 'Summit White', 'Jet Black', 'Pickup Truck', '6-Speed Automatic', '4WD', 'Gasoline', '5.3L V8', 'V8', '5.3L', 355, 16, 23, 1, 1, 'DEN456789', 'Used', '2016 Chevrolet Silverado LTZ - Well-maintained work truck. Spray-in liner, trailer hitch.', '["LTZ Package", "Trailering Package", "Chrome Package", "MyLink Audio"]', '["https://example.com/s1-2.jpg"]', 75, true),
('1F1F15W86GEF567890', 2020, 'Ford', 'Explorer', 'Limited', 47995, 27800, 'Rapid Red Metallic', 'Ebony', 'SUV', '10-Speed Automatic', '4WD', 'Gasoline', '3.0L V6 Turbo', 'V6', '3.0L', 365, 21, 28, 1, 1, 'DEN567890', 'Used', '2020 Ford Explorer Limited - Loaded family SUV. 3rd row, heated seats, navigation.', '["Limited Package", "3rd Row Seating", "Panoramic Roof", "B&O Play System"]', '["https://example.com/e1.jpg", "https://example.com/e2.jpg"]', 93, true),
('JTDK3DU5A01234567', 2019, 'Toyota', 'Highlander', 'Limited', 42995, 31200, 'Blizzard Pearl', 'Chestnut', 'SUV', '8-Speed Automatic', 'AWD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 295, 20, 27, 1, 1, 'DEN678901', 'Used', '2019 Toyota Highlander Limited - One owner, non-smoker. Tows 5,000 lbs. Family ready.', '["Limited Package", "JBL Audio", "Panoramic Roof", "Birds Eye Camera", "360-Degree View"]', '["https://example.com/h1.jpg", "https://example.com/h2.jpg", "https://example.com/h3.jpg"]', 96, true),
('1C4RJFBG4KW1234567', 2018, 'Jeep', 'Wrangler', 'Rubicon', 38995, 42600, 'Firecracker Red', 'Black', 'SUV', '6-Speed Manual', '4WD', 'Gasoline', '3.6L V6', 'V6', '3.6L', 285, 17, 23, 1, 1, 'DEN789012', 'Used', '2018 Jeep Wrangler Rubicon - Hard top, soft top both included. 4" lift kit, 35" tires. Off-road beast.', '["Rubicon Package", "4:1 Rock-Trac", "Freedom Top", "Off-Road Lights"]', '["https://example.com/w1.jpg", "https://example.com/w2.jpg"]', 88, true),
('1F1F15W86HEF678901', 2019, 'Ford', 'Expedition', 'Platinum', 59995, 34500, 'White Platinum', 'Ebony', 'SUV', '10-Speed Automatic', '4WD', 'Gasoline', '3.5L V6 Turbo', 'V6', '3.5L', 400, 17, 24, 1, 1, 'DEN890123', 'Used', '2019 Ford Expedition Platinum - The ultimate family hauler. 3 rows, captain chairs, refrigerated center console.', '["Platinum Package", "Refrigerated Console", "Captain Chairs", "B&O Ultimate Sound"]', '["https://example.com/exp1.jpg", "https://example.com/exp2.jpg", "https://example.com/exp3.jpg"]', 94, true),
('1C4RJFBG5KW2345678', 2016, 'Jeep', 'Cherokee', 'Trailhawk', 28995, 51900, 'Bright White', 'Black', 'SUV', '9-Speed Automatic', '4WD', 'Gasoline', '3.2L V6', 'V6', '3.2L', 271, 18, 26, 1, 1, 'DEN901234', 'Used', '2016 Jeep Cherokee Trailhawk - Compact SUV with serious off-road capability. Daily driver, reliable.', '["Trailhawk Package", "Quadra-Lift", "Leather", "Navigation"]', '["https://example.com/ch1.jpg"]', 82, true),
('5J6RE4H58LE123456', 2017, 'Honda', 'CR-V', 'Touring', 23995, 48200, 'Modern Steel Metallic', 'Gray', 'SUV', 'CVT', 'FWD', 'Gasoline', '1.5L I4 Turbo', 'I4', '1.5L', 190, 28, 34, 1, 1, 'DEN012345', 'Used', '2017 Honda CR-V Touring - Top trim with all features. New timing belt at 45k.', '["Honda Sensing", "Touring Package", "Power Tailgate", "Wireless Charging"]', '["https://example.com/cr1.jpg", "https://example.com/cr2.jpg"]', 87, true),

-- Location 2: Aurora (18 cars) - Mix including some lower quality
('2T1BZ1HC3KC234567', 2021, 'Toyota', 'Camry', 'LE', 24995, 28700, 'Silver', 'Fabric', 'Sedan', '8-Speed Automatic', 'FWD', 'Hybrid', '2.5L I4 Hybrid', 'I4', '2.5L', 208, 51, 53, 1, 2, 'AUR789012', 'Used', '2021 Toyota Camry LE - Reliable daily driver. Great MPG, minor wear.', '["Toyota Safety Sense 2.5", "8-Inch Display", "Smart Key System"]', '["https://example.com/cam1.jpg"]', 85, true),
('1F1F15W86GEF789012', 2020, 'Ford', 'Edge', 'SEL', 31995, 34200, 'Stone Gray', 'Ebony', 'SUV', '8-Speed Automatic', 'AWD', 'Gasoline', '2.0L I4 EcoBoost', 'I4', '2.0L', 250, 21, 29, 1, 2, 'AUR890123', 'Used', '2020 Ford Edge SEL - Midsize SUV with lots of cargo space. All-wheel drive for winter.', '["SEL Package", "Leather Interior", "Panoramic Vista Roof", "SYNC 3"]', '["https://example.com/ed1.jpg", "https://example.com/ed2.jpg"]', 89, true),
('3GKALREV4JS1234567', 2017, 'Buick', 'Enclave', 'Premium', 27995, 61200, 'White Frost Tricoat', 'Cocoa', 'SUV', '6-Speed Automatic', 'FWD', 'Gasoline', '3.6L V6', 'V6', '3.6L', 288, 17, 26, 1, 2, 'AUR901234', 'Used', '2017 Buick Enclave Premium - Luxury 7-seater. Quiet ride, comfortable for long trips.', '["Premium Package", "Bose Audio", "Power Rear Liftgate", "Sunroof"]', '["https://example.com/bu1.jpg"]', 70, true),
('1G1PE5S67KF2345678', 2019, 'Chevrolet', 'Equinox', 'Premier', 26995, 40500, 'Black', 'Jet Black', 'SUV', '9-Speed Automatic', 'AWD', 'Gasoline', '2.0L I4 Turbo', 'I4', '2.0L', 252, 26, 31, 1, 2, 'AUR012345', 'Used', '2019 Chevy Equinox Premier - Compact SUV with premium feel. Navigation, heated seats.', '["Premier Package", "Driver Confidence II", "Chevrolet Infotainment 3", "Heated Seats"]', '["https://example.com/eq1.jpg"]', 83, true),
('2T1BURHE0KC3456789', 2018, 'Toyota', 'Highlander', 'XLE', 35995, 47800, 'Celestial Silver', 'Gray', 'SUV', '8-Speed Automatic', 'AWD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 295, 20, 27, 1, 2, 'AUR123456', 'Used', '2018 Toyota Highlander XLE - Family SUV with 3rd row. Dependable, well-maintained.', '["XLE Package", "Toyota Safety Connect", "Entune Premium Audio"]', '["https://example.com/h2-1.jpg", "https://example.com/h3-1.jpg"]', 86, true),
('JF2SKACC9KH2345678', 2016, 'Subaru', 'Forester', 'Touring', 20995, 63400, 'Crystal White Pearl', 'Black', 'SUV', 'Lineartronic CVT', 'AWD', 'Gasoline', '2.5L I4', 'I4', '2.5L', 170, 28, 33, 1, 2, 'AUR234567', 'Used', '2016 Subaru Forester Touring - High miles but runs strong. Recent head gaskets done.', '["Touring Package", "EyeSight", "X-Mode", "Navigation"]', '["https://example.com/f2-1.jpg"]', 60, true),
('1F1F15W75KEF123456', 2013, 'Ford', 'F-150', 'XL', 18995, 124500, 'Oxford White', 'Gray', 'Pickup Truck', '6-Speed Automatic', '4WD', 'Gasoline', '5.0L V8', 'V8', '5.0L', 360, 14, 19, 1, 2, 'AUR345678', 'Used', '2013 Ford F-150 XL - Work truck with high mileage. Runs but needs some work.', '["Work Truck Package", "Tow Package", "Rubber Floor Mats"]', '["https://example.com/f3-1.jpg"]', 45, true),
('JM1BK3F5GKC123456', 2019, 'Mazda', 'Mazda3', 'Grand Touring', 25995, 31200, 'Soul Red Crystal', 'Black', 'Sedan', '6-Speed Automatic', 'AWD', 'Gasoline', '2.5L I4', 'I4', '2.5L', 186, 26, 35, 1, 2, 'AUR456789', 'Used', '2019 Mazda3 Grand Touring - Sporty sedan with AWD. Premium package, great condition.', '["Grand Touring Package", "i-Activsense", "Bose Audio", "Leather"]', '["https://example.com/m3-1.jpg", "https://example.com/m3-2.jpg"]', 92, true),
('1C4RJFBG1KW3456789', 2015, 'Jeep', 'Cherokee', 'Sport', 19995, 71800, 'Bright White', 'Black', 'SUV', '9-Speed Automatic', '4WD', 'Gasoline', '2.4L I4', 'I4', '2.4L', 184, 21, 28, 1, 2, 'AUR567890', 'Used', '2015 Jeep Cherokee Sport - Base model but well-equipped. Needs some TLC.', '["Sport Package", "Uconnect", "Bluetooth", "SiriusXM"]', '["https://example.com/ch2-1.jpg"]', 50, true),
('5YJ3E1E7KF3456789', 2019, 'Tesla', 'Model Y', 'Long Range RWD', 42995, 38900, 'Midnight Silver Metallic', 'Black', 'SUV', 'Single Speed', 'RWD', 'Electric', 'Dual Motor', 'N/A', 'N/A', 384, 121, 112, 1, 2, 'AUR678901', 'Used', '2019 Tesla Model Y - Long range, no Autopilot but great range. Clean title.', '["Long Range Battery", "Premium Audio", "Partial Leather", "Autopilot Upgrade Ready"]', '["https://example.com/t2-1.jpg", "https://example.com/t2-2.jpg"]', 88, true),
('2HGFC3F56KH5678901', 2017, 'Honda', 'Accord', 'Touring', 22995, 54100, 'Lunar Silver Metallic', 'Gray', 'Sedan', 'CVT', 'FWD', 'Gasoline', '2.4L I4', 'I4', '2.4L', 185, 27, 36, 1, 2, 'AUR789012', 'Used', '2017 Honda Accord Touring - Higher mileage but runs good. Recent timing belt service.', '["Honda Sensing", "Touring Trim", "Apple CarPlay", "Heated Seats"]', '["https://example.com/acc1.jpg"]', 68, true),
('1G1YE2D64KE234567', 2018, 'Chevrolet', 'Traverse', 'Premier', 34995, 45100, 'Peacock Green Metallic', 'Jet Black', 'SUV', '9-Speed Automatic', 'FWD', 'Gasoline', '3.6L V6', 'V6', '3.6L', 310, 18, 27, 1, 2, 'AUR890123', 'Used', '2018 Chevy Traverse Premier - Large SUV for the whole family. Captains chairs, nav.', '["Premier Package", "Driver Confidence II", "Rear Entertainment"]', '["https://example.com/tr1.jpg", "https://example.com/tr2.jpg"]', 81, true),
('5YJSA1E28JF1234567', 2016, 'Tesla', 'Model S', '75D', 44995, 68700, 'Solid Black', 'Black', 'Sedan', 'Single Speed', 'RWD', 'Electric', 'Electric Motor', 'N/A', 'N/A', 329, 95, 106, 1, 2, 'AUR012345', 'Used', '2016 Tesla Model S 75D - Still runs great but shows wear. Good range.', '["Autopilot", "Premium Interior", "Supercharging", "Air Suspension"]', '["https://example.com/ts1.jpg", "https://example.com/ts2.jpg"]', 72, true),

-- Location 3: Lakewood (19 cars) - Mix including some missing data
('1F1F15W85KEF8901234', 2022, 'Ford', 'F-150', 'King Ranch', 54995, 18500, 'Agate Black', 'Medium Dark Slate', 'Pickup Truck', '10-Speed Automatic', '4WD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 400, 19, 24, 1, 3, 'LAK123456', 'Used', '2022 Ford F-150 King Ranch - Like new! Only 18k miles. SuperCab, premium audio.', '["King Ranch Package", "Leather", "B&O Unleashed", "Trailering"]', '["https://example.com/f4-1.jpg", "https://example.com/f4-2.jpg", "https://example.com/f4-3.jpg"]', 97, true),
('2T1BURHE6KC4567890', 2020, 'Toyota', '4Runner', 'TRD Off-Road', 47995, 35600, 'Super White', 'Black', 'SUV', '5-Speed Automatic', '4WD', 'Gasoline', '4.0L V6', 'V6', '4.0L', 270, 16, 20, 1, 3, 'LAK234567', 'Used', '2020 Toyota 4Runner TRD Off-Road - Off-road beast. Low miles, excellent condition.', '["TRD Off-Road Package", "KDSS", "Crawl Control", "Multi-Terrain"]', '["https://example.com/4r1.jpg", "https://example.com/4r2.jpg"]', 95, true),
('JN8AZ2NE0G01234567', 2021, 'Nissan', 'Frontier', 'PRO-4X', 37995, 22400, 'Gun Metallic', 'Charcoal', 'Pickup Truck', '9-Speed Automatic', '4WD', 'Gasoline', '3.8L V6', 'V6', '3.8L', 310, 17, 23, 1, 3, 'LAK345678', 'Used', '2021 Nissan Frontier PRO-4X - Mid-size truck with serious off-road capability. Well-maintained.', '["PRO-4X Package", "Rockford Fosgate", "Utili-Track", "Skid Plates"]', '["https://example.com/n1.jpg", "https://example.com/n2.jpg"]', 91, true),
('3VWD17AJ0KM1234567', 2021, 'Ford', 'Bronco', 'Badlands', 54995, 12300, 'Area 51', 'Black Onyx', 'SUV', '10-Speed Automatic', '4WD', 'Gasoline', '2.3L I4', 'I4', '2.3L', 300, 20, 24, 1, 3, 'LAK456789', 'Used', '2021 Ford Bronco Badlands - Pristine condition, still under warranty. Off-road ready.', '["Badlands Package", "Sasquatch Package", "HOSS Suspension", "35-inch Tires"]', '["https://example.com/br1.jpg", "https://example.com/br2.jpg", "https://example.com/br3.jpg"]', 96, true),
('1C4RJFBG6KW4567890', 2019, 'Jeep', 'Gladiator', 'Rubicon', 45995, 28900, 'Gator Green', 'Black', 'Pickup Truck', '6-Speed Manual', '4WD', 'Gasoline', '3.6L V6', 'V6', '3.6L', 285, 17, 23, 1, 3, 'LAK567890', 'Used', '2019 Jeep Gladiator Rubicon - Like new! Manual transmission, hardtop included. Rare color.', '["Rubicon Package", "4:1 Rock-Trac", "Freedom Top", "Max Tow Package"]', '["https://example.com/gl1.jpg", "https://example.com/gl2.jpg"]', 94, true),
('5N1AR2N6FC1234567', 2021, 'Toyota', 'Tacoma', 'TRD Off-Road', 42995, 29800, 'Super White', 'Black', 'Pickup Truck', '6-Speed Automatic', '4WD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 278, 19, 22, 1, 3, 'LAK678901', 'Used', '2021 Toyota Tacoma TRD Off-Road - Ready for adventure. Low miles, excellent.', '["TRD Off-Road", "Crawl Control", "Multi-Terrain Select", "Locking Rear Diff"]', '["https://example.com/tac1.jpg", "https://example.com/tac2.jpg"]', 93, true),
('JN1AZ1CP1KC2345678', 2020, 'Nissan', 'Pathfinder', 'SL', 34995, 36700, 'Pearl White', 'Charcoal', 'SUV', 'CVT', 'FWD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 284, 20, 27, 1, 3, 'LAK789012', 'Used', '2020 Nissan Pathfinder SL - Family hauler with 3rd row. Clean CarFax.', '["SL Premium Package", "NissanConnect", "Bose Audio", "Heated Seats"]', '["https://example.com/path1.jpg", "https://example.com/path2.jpg"]', 88, true),
('1F1F15W75KEF234567', 2014, 'Ford', 'F-150', 'Platinum', 32995, 94500, 'Ruby Red', 'Ebony', 'Pickup Truck', '6-Speed Automatic', '4WD', 'Gasoline', '3.5L V6', 'V6', '3.5L', 365, 17, 23, 1, 3, 'LAK890123', 'Used', '2014 Ford F-150 Platinum - High miles but excellent condition. Platinum trim has all options.', '["Platinum Package", "Leather", "Sunroof", "Sony Audio"]', '["https://example.com/f5-1.jpg"]', 78, true),
('2T1BURHE7KC5678901', 2022, 'Toyota', 'Tundra', 'Limited', 52995, 25400, 'Wind Chill Pearl', 'Black', 'Pickup Truck', '10-Speed Automatic', '4WD', 'Gasoline', '5.7L V8', 'V8', '5.7L', 381, 13, 17, 1, 3, 'LAK901234', 'Used', '2022 Toyota Tundra Limited - Half-ton truck with V8 power. Towing package, bed liner.', '["Limited Package", "57i-FE V8", "Towing Package", "Multi-Terrain"]', '["https://example.com/tun1.jpg", "https://example.com/tun2.jpg"]', 95, true),
('5YJSA1E35JF2345678', 2018, 'Tesla', 'Model 3', 'Long Range AWD', 39995, 41200, 'Blue', 'White', 'Sedan', 'Single Speed', 'AWD', 'Electric', 'Dual Motor', 'N/A', 'N/A', 348, 116, 110, 1, 3, 'LAK012345', 'Used', '2018 Tesla Model 3 Long Range AWD - Full Autopilot, FSD computer included. Great condition.', '["Autopilot", "FSD Computer", "Premium Interior", "Long Range Battery"]', '["https://example.com/t3-1.jpg", "https://example.com/t3-2.jpg"]', 90, true),
('1C4RJFBG0KW6789012', 2016, 'Jeep', 'Renegade', 'Trailhawk', 23995, 54300, 'Vulkan Grey', 'Black', 'SUV', '9-Speed Automatic', '4WD', 'Gasoline', '2.4L I4', 'I4', '2.4L', 180, 21, 28, 1, 3, 'LAK123456', 'Used', '2016 Jeep Renegade Trailhawk - Small but capable. High miles, some cosmetic wear.', '["Trailhawk Package", "Uconnect", "Bluetooth", "SiriusXM"]', '["https://example.com/ren1.jpg"]', 65, true),
('JM1BK3F57KC345678', 2020, 'Mazda', 'CX-9', 'Signature', 34995, 26800, 'Machine Gray', 'Parchment', 'SUV', '6-Speed Automatic', 'AWD', 'Gasoline', '2.5L I4', 'I4', '2.5L', 187, 24, 28, 1, 3, 'LAK234567', 'Used', '2020 Mazda CX-9 Signature - 3-row family SUV. Premium features, captain chairs. Excellent.', '["Signature Package", "Bose Audio", "Captain Chairs", "Power Rear Liftgate"]', '["https://example.com/cx9-1.jpg", "https://example.com/cx9-2.jpg"]', 93, true),
('1F1F15W86KEF3456789', 2017, 'Ford', 'Expedition', 'MAX', 64995, 41200, 'Magnetic Metallic', 'Ebony', 'SUV', '10-Speed Automatic', '4WD', 'Gasoline', '3.5L V6 Turbo', 'V6', '3.5L', 400, 16, 21, 1, 3, 'LAK345678', 'Used', '2017 Ford Expedition MAX - The ultimate family hauler. Extended length, all the space.', '["MAX Platinum Package", "3rd Row", "Panoramic Roof", "22-Speaker Audio"]', '["https://example.com/exp2-1.jpg", "https://example.com/exp2-2.jpg"]', 92, true);

-- Verify data
SELECT 
    'Total Vehicles' as metric, 
    COUNT(*) as value 
FROM vehicles
UNION ALL
SELECT 
    'Denver Location' as metric, 
    COUNT(*) as value 
FROM vehicles WHERE location_id = 1
UNION ALL
SELECT 
    'Aurora Location' as metric, 
    COUNT(*) as value 
FROM vehicles WHERE location_id = 2
UNION ALL
SELECT 
    'Lakewood Location' as metric, 
    COUNT(*) as value 
FROM vehicles WHERE location_id = 3;
