-- Seed: 001_seed_initial_data.sql
-- Description: Initial baseline fixtures for medicines and default clinic users

-- 1. Initial Homeopathic Dispensary Inventory
INSERT INTO public.inventory (id, name, potency, formulation, price_inr, category, stock_qty, reorder_qty, supplier, batch_number)
VALUES
    ('m1', 'Arnica Montana', '30C', 'Globules 4g', 160.00, 'acute', 45, 10, 'SBL Pvt Ltd', 'BTH-M1-2026'),
    ('m2', 'Lycopodium Clavatum', '200C', 'Globules 4g', 210.00, 'constitutional', 12, 10, 'Boiron India', 'BTH-M2-2026'),
    ('m3', 'Nux Vomica', '30C', 'Drops 30ml', 140.00, 'acute', 88, 10, 'Reckeweg India', 'BTH-M3-2026'),
    ('m4', 'Sulphur', '200C', 'Globules 4g', 195.00, 'constitutional', 5, 10, 'SBL Pvt Ltd', 'BTH-M4-2026'),
    ('m5', 'Belladonna', '6C', 'Globules 4g', 120.00, 'acute', 30, 10, 'Schwabe India', 'BTH-M5-2026'),
    ('m6', 'Natrum Muriaticum', '200C', 'Globules 4g', 220.00, 'constitutional', 67, 10, 'SBL Pvt Ltd', 'BTH-M6-2026'),
    ('m7', 'Calcarea Fluorica', '6X', 'Tissue Salt', 185.00, 'tissue-salt', 9, 10, 'Reckeweg India', 'BTH-M7-2026'),
    ('m8', 'Silicea', '12X', 'Tissue Salt', 175.00, 'tissue-salt', 22, 10, 'Schwabe India', 'BTH-M8-2026')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Default Admin & Demo Patient Accounts
INSERT INTO public.clinic_users (id, email, name, phone, password_hash, password_salt, role)
VALUES
    ('usr-admin-01', 'doctor@agastyaclinic.com', 'Dr. Bramarambha K', '+91 98450 12345', '710bcfdafa46c4f9ea93e3dfffa7dc647feecbb113ca24d852033bc6f5bf14a7', '61d9894e4aa5e6e8869c9b0cf292ea80', 'admin'),
    ('usr-demo-01', 'patient@agastyaclinic.com', 'Demo Patient', '+91 98765 43210', '710bcfdafa46c4f9ea93e3dfffa7dc647feecbb113ca24d852033bc6f5bf14a7', '61d9894e4aa5e6e8869c9b0cf292ea80', 'patient')
ON CONFLICT (email) DO NOTHING;

