-- Joey's Farm: staff-side seed data (50 customers, 50 orders, order items, return requests,
-- replacement orders, 50 customer messages and inventory).
-- Run AFTER database.sql, orders_inventory.sql and contact_messages.sql.
-- Safe to rerun: it first removes anything it created earlier (customers whose email ends in
-- @seed.joeysfarm.test and their orders/returns/messages), then inserts fresh rows.
-- Every seeded customer logs in with the password: customer123
-- Dates are relative to NOW(), so the staff dashboard (daily/weekly/monthly sales) is always populated.
USE joeys_farm;

-- Columns that the PHP code normally adds on first use; added here so the inserts below always work.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_id INT UNSIGNED NULL;
ALTER TABLE egg_returns ADD COLUMN IF NOT EXISTS image_file VARCHAR(64) NULL;
ALTER TABLE egg_returns ADD COLUMN IF NOT EXISTS image_mime VARCHAR(30) NULL;
ALTER TABLE egg_returns ADD COLUMN IF NOT EXISTS staff_message VARCHAR(500) NULL;

-- ---------- cleanup of earlier runs ----------
DELETE FROM egg_returns WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@seed.joeysfarm.test');
DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@seed.joeysfarm.test');
DELETE FROM contact_messages WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@seed.joeysfarm.test');
DELETE FROM users WHERE email LIKE '%@seed.joeysfarm.test';

-- ---------- 1. Customers (50 different users, password: customer123) ----------
INSERT INTO users (name, email, password_hash, role, address, contact, created_at) VALUES
('Maria Santos','maria.santos@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','143 Maginhawa St, Teachers Village, Quezon City','09185881399',DATE_SUB(NOW(), INTERVAL 148 DAY)),
('Juan Dela Cruz','juan.delacruz@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','74 Kamias Rd, Brgy. Kamuning, Quezon City','09159730911',DATE_SUB(NOW(), INTERVAL 199 DAY)),
('Jose Reyes','jose.reyes@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','90 Tandang Sora Ave, Brgy. Culiat, Quezon City','09187075364',DATE_SUB(NOW(), INTERVAL 140 DAY)),
('Ana Garcia','ana.garcia@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','74 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09068151884',DATE_SUB(NOW(), INTERVAL 153 DAY)),
('Pedro Ramos','pedro.ramos@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','24 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09199405576',DATE_SUB(NOW(), INTERVAL 146 DAY)),
('Carmen Mendoza','carmen.mendoza@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','67 Visayas Ave, Brgy. Vasra, Quezon City','09151689768',DATE_SUB(NOW(), INTERVAL 148 DAY)),
('Luis Torres','luis.torres@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','247 Timog Ave, Brgy. South Triangle, Quezon City','09158809320',DATE_SUB(NOW(), INTERVAL 185 DAY)),
('Rosa Flores','rosa.flores@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','161 Araneta Ave, Brgy. Tatalon, Quezon City','09189672731',DATE_SUB(NOW(), INTERVAL 184 DAY)),
('Miguel Castillo','miguel.castillo@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','205 Congressional Ave, Brgy. Bahay Toro, Quezon City','09157848648',DATE_SUB(NOW(), INTERVAL 177 DAY)),
('Elena Villanueva','elena.villanueva@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','39 Mindanao Ave, Brgy. Pasong Tamo, Quezon City','09156634400',DATE_SUB(NOW(), INTERVAL 178 DAY)),
('Antonio Bautista','antonio.bautista@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','131 Quirino Hwy, Brgy. Talipapa, Quezon City','09158753477',DATE_SUB(NOW(), INTERVAL 193 DAY)),
('Sofia Aquino','sofia.aquino@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','113 Aurora Blvd, Brgy. Cubao, Quezon City','09156804571',DATE_SUB(NOW(), INTERVAL 183 DAY)),
('Ramon Cruz','ramon.cruz@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','95 Scout Borromeo St, Brgy. Laging Handa, Quezon City','09287267147',DATE_SUB(NOW(), INTERVAL 107 DAY)),
('Teresa Navarro','teresa.navarro@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','149 Don Antonio St, Brgy. Holy Spirit, Quezon City','09276270107',DATE_SUB(NOW(), INTERVAL 164 DAY)),
('Carlos Domingo','carlos.domingo@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','245 Regalado Ave, Brgy. Fairview, Quezon City','09189331908',DATE_SUB(NOW(), INTERVAL 129 DAY)),
('Isabel Salazar','isabel.salazar@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','140 Maginhawa St, Teachers Village, Quezon City','09052059972',DATE_SUB(NOW(), INTERVAL 123 DAY)),
('Fernando Aguilar','fernando.aguilar@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','172 Kamias Rd, Brgy. Kamuning, Quezon City','09159298416',DATE_SUB(NOW(), INTERVAL 115 DAY)),
('Lourdes Pascual','lourdes.pascual@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','207 Tandang Sora Ave, Brgy. Culiat, Quezon City','09199486628',DATE_SUB(NOW(), INTERVAL 120 DAY)),
('Roberto Santiago','roberto.santiago@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','240 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09060161055',DATE_SUB(NOW(), INTERVAL 193 DAY)),
('Patricia Lim','patricia.lim@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','234 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09170875475',DATE_SUB(NOW(), INTERVAL 110 DAY)),
('Eduardo Tan','eduardo.tan@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','53 Visayas Ave, Brgy. Vasra, Quezon City','09157992298',DATE_SUB(NOW(), INTERVAL 150 DAY)),
('Cristina Go','cristina.go@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','51 Timog Ave, Brgy. South Triangle, Quezon City','09057931860',DATE_SUB(NOW(), INTERVAL 177 DAY)),
('Manuel Dizon','manuel.dizon@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','34 Araneta Ave, Brgy. Tatalon, Quezon City','09190807370',DATE_SUB(NOW(), INTERVAL 177 DAY)),
('Gloria Soriano','gloria.soriano@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','137 Congressional Ave, Brgy. Bahay Toro, Quezon City','09278222646',DATE_SUB(NOW(), INTERVAL 148 DAY)),
('Ricardo Manalo','ricardo.manalo@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','128 Mindanao Ave, Brgy. Pasong Tamo, Quezon City','09186425247',DATE_SUB(NOW(), INTERVAL 194 DAY)),
('Angelica Esteban','angelica.esteban@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','31 Quirino Hwy, Brgy. Talipapa, Quezon City','09064725877',DATE_SUB(NOW(), INTERVAL 162 DAY)),
('Daniel Rivera','daniel.rivera@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','105 Aurora Blvd, Brgy. Cubao, Quezon City','09281330175',DATE_SUB(NOW(), INTERVAL 164 DAY)),
('Jasmine Ocampo','jasmine.ocampo@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','56 Scout Borromeo St, Brgy. Laging Handa, Quezon City','09190525898',DATE_SUB(NOW(), INTERVAL 109 DAY)),
('Mark Valdez','mark.valdez@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','172 Don Antonio St, Brgy. Holy Spirit, Quezon City','09288939494',DATE_SUB(NOW(), INTERVAL 166 DAY)),
('Kristine Cabrera','kristine.cabrera@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','195 Regalado Ave, Brgy. Fairview, Quezon City','09191416210',DATE_SUB(NOW(), INTERVAL 140 DAY)),
('Joshua Mercado','joshua.mercado@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','239 Maginhawa St, Teachers Village, Quezon City','09191854914',DATE_SUB(NOW(), INTERVAL 135 DAY)),
('Bianca Padilla','bianca.padilla@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','248 Kamias Rd, Brgy. Kamuning, Quezon City','09194410646',DATE_SUB(NOW(), INTERVAL 96 DAY)),
('Nathan Velasco','nathan.velasco@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','148 Tandang Sora Ave, Brgy. Culiat, Quezon City','09171304118',DATE_SUB(NOW(), INTERVAL 139 DAY)),
('Camille Roxas','camille.roxas@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','56 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09057990659',DATE_SUB(NOW(), INTERVAL 171 DAY)),
('Gabriel Evangelista','gabriel.evangelista@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','243 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09156158464',DATE_SUB(NOW(), INTERVAL 199 DAY)),
('Danica Lacson','danica.lacson@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','77 Visayas Ave, Brgy. Vasra, Quezon City','09050604541',DATE_SUB(NOW(), INTERVAL 193 DAY)),
('Vincent Alvarez','vincent.alvarez@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','15 Timog Ave, Brgy. South Triangle, Quezon City','09065908538',DATE_SUB(NOW(), INTERVAL 187 DAY)),
('Hazel Tolentino','hazel.tolentino@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','91 Araneta Ave, Brgy. Tatalon, Quezon City','09182911028',DATE_SUB(NOW(), INTERVAL 171 DAY)),
('Patrick Gonzales','patrick.gonzales@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','97 Congressional Ave, Brgy. Bahay Toro, Quezon City','09280692566',DATE_SUB(NOW(), INTERVAL 125 DAY)),
('Joanna Magno','joanna.magno@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','102 Mindanao Ave, Brgy. Pasong Tamo, Quezon City','09063228088',DATE_SUB(NOW(), INTERVAL 127 DAY)),
('Kenneth Sison','kenneth.sison@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','68 Quirino Hwy, Brgy. Talipapa, Quezon City','09193004876',DATE_SUB(NOW(), INTERVAL 135 DAY)),
('Trisha Javier','trisha.javier@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','88 Aurora Blvd, Brgy. Cubao, Quezon City','09199128084',DATE_SUB(NOW(), INTERVAL 176 DAY)),
('Dennis Bustamante','dennis.bustamante@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','221 Scout Borromeo St, Brgy. Laging Handa, Quezon City','09050037038',DATE_SUB(NOW(), INTERVAL 114 DAY)),
('Rhea Corpuz','rhea.corpuz@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','92 Don Antonio St, Brgy. Holy Spirit, Quezon City','09065384535',DATE_SUB(NOW(), INTERVAL 153 DAY)),
('Allan Fernandez','allan.fernandez@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','40 Regalado Ave, Brgy. Fairview, Quezon City','09158794326',DATE_SUB(NOW(), INTERVAL 157 DAY)),
('Marites Panganiban','marites.panganiban@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','96 Maginhawa St, Teachers Village, Quezon City','09175860214',DATE_SUB(NOW(), INTERVAL 164 DAY)),
('Jericho Zamora','jericho.zamora@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','147 Kamias Rd, Brgy. Kamuning, Quezon City','09282108394',DATE_SUB(NOW(), INTERVAL 100 DAY)),
('Liza Enriquez','liza.enriquez@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','37 Tandang Sora Ave, Brgy. Culiat, Quezon City','09066882811',DATE_SUB(NOW(), INTERVAL 188 DAY)),
('Benedict Ilagan','benedict.ilagan@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','42 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09065844093',DATE_SUB(NOW(), INTERVAL 132 DAY)),
('Shiela Macaraeg','shiela.macaraeg@seed.joeysfarm.test','$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K','customer','217 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09288452630',DATE_SUB(NOW(), INTERVAL 172 DAY));

-- ---------- 2. Orders: 10 pending, 8 confirmed, 26 completed, 6 cancelled (one per customer) ----------
INSERT INTO orders (receipt_no, user_id, customer_name, address, contact, payment, total, discount_total, delivery_date, status, remark, created_at, completed_at) VALUES
('REC-2026-S001',(SELECT id FROM users WHERE email='maria.santos@seed.joeysfarm.test'),'Maria Santos','143 Maginhawa St, Teachers Village, Quezon City','09185881399','Cash on Delivery (COD)',2155.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -45 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 3 HOUR),NULL),
('REC-2026-S002',(SELECT id FROM users WHERE email='juan.delacruz@seed.joeysfarm.test'),'Juan Dela Cruz','74 Kamias Rd, Brgy. Kamuning, Quezon City','09159730911','Cash on Delivery (COD)',92.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -14 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 34 HOUR),NULL),
('REC-2026-S003',(SELECT id FROM users WHERE email='jose.reyes@seed.joeysfarm.test'),'Jose Reyes','90 Tandang Sora Ave, Brgy. Culiat, Quezon City','09187075364','Cash on Delivery (COD)',2017.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -31 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 17 HOUR),NULL),
('REC-2026-S004',(SELECT id FROM users WHERE email='ana.garcia@seed.joeysfarm.test'),'Ana Garcia','74 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09068151884','GCash',588.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -42 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 6 HOUR),NULL),
('REC-2026-S005',(SELECT id FROM users WHERE email='pedro.ramos@seed.joeysfarm.test'),'Pedro Ramos','24 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09199405576','GCash',294.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -16 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 32 HOUR),NULL),
('REC-2026-S006',(SELECT id FROM users WHERE email='carmen.mendoza@seed.joeysfarm.test'),'Carmen Mendoza','67 Visayas Ave, Brgy. Vasra, Quezon City','09151689768','GCash',1242.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -17 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 31 HOUR),NULL),
('REC-2026-S007',(SELECT id FROM users WHERE email='luis.torres@seed.joeysfarm.test'),'Luis Torres','247 Timog Ave, Brgy. South Triangle, Quezon City','09158809320','GCash',436.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -27 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 21 HOUR),NULL),
('REC-2026-S008',(SELECT id FROM users WHERE email='rosa.flores@seed.joeysfarm.test'),'Rosa Flores','161 Araneta Ave, Brgy. Tatalon, Quezon City','09189672731','GCash',2445.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -15 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 33 HOUR),NULL),
('REC-2026-S009',(SELECT id FROM users WHERE email='miguel.castillo@seed.joeysfarm.test'),'Miguel Castillo','205 Congressional Ave, Brgy. Bahay Toro, Quezon City','09157848648','GCash',390.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -24 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 24 HOUR),NULL),
('REC-2026-S010',(SELECT id FROM users WHERE email='elena.villanueva@seed.joeysfarm.test'),'Elena Villanueva','39 Mindanao Ave, Brgy. Pasong Tamo, Quezon City','09156634400','GCash',436.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -37 HOUR)),'pending','',DATE_SUB(NOW(), INTERVAL 11 HOUR),NULL),
('REC-2026-S011',(SELECT id FROM users WHERE email='antonio.bautista@seed.joeysfarm.test'),'Antonio Bautista','131 Quirino Hwy, Brgy. Talipapa, Quezon City','09158753477','GCash',897.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -11 HOUR)),'confirmed','Out for delivery',DATE_SUB(NOW(), INTERVAL 37 HOUR),NULL),
('REC-2026-S012',(SELECT id FROM users WHERE email='sofia.aquino@seed.joeysfarm.test'),'Sofia Aquino','113 Aurora Blvd, Brgy. Cubao, Quezon City','09156804571','Cash on Delivery (COD)',309.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -19 HOUR)),'confirmed','Out for delivery',DATE_SUB(NOW(), INTERVAL 29 HOUR),NULL),
('REC-2026-S013',(SELECT id FROM users WHERE email='ramon.cruz@seed.joeysfarm.test'),'Ramon Cruz','95 Scout Borromeo St, Brgy. Laging Handa, Quezon City','09287267147','GCash',828.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -27 HOUR)),'confirmed','Packed, awaiting rider',DATE_SUB(NOW(), INTERVAL 21 HOUR),NULL),
('REC-2026-S014',(SELECT id FROM users WHERE email='teresa.navarro@seed.joeysfarm.test'),'Teresa Navarro','149 Don Antonio St, Brgy. Holy Spirit, Quezon City','09276270107','Cash on Delivery (COD)',1104.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 12 HOUR)),'confirmed','Out for delivery',DATE_SUB(NOW(), INTERVAL 60 HOUR),NULL),
('REC-2026-S015',(SELECT id FROM users WHERE email='carlos.domingo@seed.joeysfarm.test'),'Carlos Domingo','245 Regalado Ave, Brgy. Fairview, Quezon City','09189331908','Cash on Delivery (COD)',1170.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -17 HOUR)),'confirmed','Out for delivery',DATE_SUB(NOW(), INTERVAL 31 HOUR),NULL),
('REC-2026-S016',(SELECT id FROM users WHERE email='isabel.salazar@seed.joeysfarm.test'),'Isabel Salazar','140 Maginhawa St, Teachers Village, Quezon City','09052059972','Cash on Delivery (COD)',1401.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -28 HOUR)),'confirmed','Confirmed and scheduled',DATE_SUB(NOW(), INTERVAL 20 HOUR),NULL),
('REC-2026-S017',(SELECT id FROM users WHERE email='fernando.aguilar@seed.joeysfarm.test'),'Fernando Aguilar','172 Kamias Rd, Brgy. Kamuning, Quezon City','09159298416','GCash',667.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 4 HOUR)),'confirmed','Packed, awaiting rider',DATE_SUB(NOW(), INTERVAL 52 HOUR),NULL),
('REC-2026-S018',(SELECT id FROM users WHERE email='lourdes.pascual@seed.joeysfarm.test'),'Lourdes Pascual','207 Tandang Sora Ave, Brgy. Culiat, Quezon City','09199486628','Cash on Delivery (COD)',482.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL -7 HOUR)),'confirmed','Out for delivery',DATE_SUB(NOW(), INTERVAL 41 HOUR),NULL),
('REC-2026-S019',(SELECT id FROM users WHERE email='roberto.santiago@seed.joeysfarm.test'),'Roberto Santiago','240 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09060161055','GCash',930.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 12 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 60 HOUR),DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('REC-2026-S020',(SELECT id FROM users WHERE email='patricia.lim@seed.joeysfarm.test'),'Patricia Lim','234 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09170875475','Cash on Delivery (COD)',195.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 16 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 64 HOUR),DATE_SUB(NOW(), INTERVAL 16 HOUR)),
('REC-2026-S021',(SELECT id FROM users WHERE email='eduardo.tan@seed.joeysfarm.test'),'Eduardo Tan','53 Visayas Ave, Brgy. Vasra, Quezon City','09157992298','GCash',1401.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 9 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 57 HOUR),DATE_SUB(NOW(), INTERVAL 9 HOUR)),
('REC-2026-S022',(SELECT id FROM users WHERE email='cristina.go@seed.joeysfarm.test'),'Cristina Go','51 Timog Ave, Brgy. South Triangle, Quezon City','09057931860','GCash',872.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 24 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 72 HOUR),DATE_SUB(NOW(), INTERVAL 24 HOUR)),
('REC-2026-S023',(SELECT id FROM users WHERE email='manuel.dizon@seed.joeysfarm.test'),'Manuel Dizon','34 Araneta Ave, Brgy. Tatalon, Quezon City','09190807370','GCash',207.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 597 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 645 HOUR),DATE_SUB(NOW(), INTERVAL 597 HOUR)),
('REC-2026-S024',(SELECT id FROM users WHERE email='gloria.soriano@seed.joeysfarm.test'),'Gloria Soriano','137 Congressional Ave, Brgy. Bahay Toro, Quezon City','09278222646','GCash',1671.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 434 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 482 HOUR),DATE_SUB(NOW(), INTERVAL 434 HOUR)),
('REC-2026-S025',(SELECT id FROM users WHERE email='ricardo.manalo@seed.joeysfarm.test'),'Ricardo Manalo','128 Mindanao Ave, Brgy. Pasong Tamo, Quezon City','09186425247','GCash',309.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 956 HOUR)),'completed','Delivered',DATE_SUB(NOW(), INTERVAL 1004 HOUR),DATE_SUB(NOW(), INTERVAL 956 HOUR)),
('REC-2026-S026',(SELECT id FROM users WHERE email='angelica.esteban@seed.joeysfarm.test'),'Angelica Esteban','31 Quirino Hwy, Brgy. Talipapa, Quezon City','09064725877','GCash',2252.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 758 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 806 HOUR),DATE_SUB(NOW(), INTERVAL 758 HOUR)),
('REC-2026-S027',(SELECT id FROM users WHERE email='daniel.rivera@seed.joeysfarm.test'),'Daniel Rivera','105 Aurora Blvd, Brgy. Cubao, Quezon City','09281330175','Cash on Delivery (COD)',621.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 435 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 483 HOUR),DATE_SUB(NOW(), INTERVAL 435 HOUR)),
('REC-2026-S028',(SELECT id FROM users WHERE email='jasmine.ocampo@seed.joeysfarm.test'),'Jasmine Ocampo','56 Scout Borromeo St, Brgy. Laging Handa, Quezon City','09190525898','Cash on Delivery (COD)',1586.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 10 HOUR)),'completed','Paid cash on delivery',DATE_SUB(NOW(), INTERVAL 58 HOUR),DATE_SUB(NOW(), INTERVAL 10 HOUR)),
('REC-2026-S029',(SELECT id FROM users WHERE email='mark.valdez@seed.joeysfarm.test'),'Mark Valdez','172 Don Antonio St, Brgy. Holy Spirit, Quezon City','09288939494','Cash on Delivery (COD)',2029.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 15 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 63 HOUR),DATE_SUB(NOW(), INTERVAL 15 HOUR)),
('REC-2026-S030',(SELECT id FROM users WHERE email='kristine.cabrera@seed.joeysfarm.test'),'Kristine Cabrera','195 Regalado Ave, Brgy. Fairview, Quezon City','09191416210','Cash on Delivery (COD)',2548.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 1256 HOUR)),'completed','Paid cash on delivery',DATE_SUB(NOW(), INTERVAL 1304 HOUR),DATE_SUB(NOW(), INTERVAL 1256 HOUR)),
('REC-2026-S031',(SELECT id FROM users WHERE email='joshua.mercado@seed.joeysfarm.test'),'Joshua Mercado','239 Maginhawa St, Teachers Village, Quezon City','09191854914','GCash',293.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 137 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 185 HOUR),DATE_SUB(NOW(), INTERVAL 137 HOUR)),
('REC-2026-S032',(SELECT id FROM users WHERE email='bianca.padilla@seed.joeysfarm.test'),'Bianca Padilla','248 Kamias Rd, Brgy. Kamuning, Quezon City','09194410646','Cash on Delivery (COD)',2473.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 193 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 241 HOUR),DATE_SUB(NOW(), INTERVAL 193 HOUR)),
('REC-2026-S033',(SELECT id FROM users WHERE email='nathan.velasco@seed.joeysfarm.test'),'Nathan Velasco','148 Tandang Sora Ave, Brgy. Culiat, Quezon City','09171304118','Cash on Delivery (COD)',1504.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 24 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 72 HOUR),DATE_SUB(NOW(), INTERVAL 24 HOUR)),
('REC-2026-S034',(SELECT id FROM users WHERE email='camille.roxas@seed.joeysfarm.test'),'Camille Roxas','56 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09057990659','GCash',2067.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 136 HOUR)),'completed','Delivered',DATE_SUB(NOW(), INTERVAL 184 HOUR),DATE_SUB(NOW(), INTERVAL 136 HOUR)),
('REC-2026-S035',(SELECT id FROM users WHERE email='gabriel.evangelista@seed.joeysfarm.test'),'Gabriel Evangelista','243 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09156158464','Cash on Delivery (COD)',2805.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 593 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 641 HOUR),DATE_SUB(NOW(), INTERVAL 593 HOUR)),
('REC-2026-S036',(SELECT id FROM users WHERE email='danica.lacson@seed.joeysfarm.test'),'Danica Lacson','77 Visayas Ave, Brgy. Vasra, Quezon City','09050604541','GCash',195.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 193 HOUR)),'completed','Paid cash on delivery',DATE_SUB(NOW(), INTERVAL 241 HOUR),DATE_SUB(NOW(), INTERVAL 193 HOUR)),
('REC-2026-S037',(SELECT id FROM users WHERE email='vincent.alvarez@seed.joeysfarm.test'),'Vincent Alvarez','15 Timog Ave, Brgy. South Triangle, Quezon City','09065908538','Cash on Delivery (COD)',1413.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 12 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 60 HOUR),DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('REC-2026-S038',(SELECT id FROM users WHERE email='hazel.tolentino@seed.joeysfarm.test'),'Hazel Tolentino','91 Araneta Ave, Brgy. Tatalon, Quezon City','09182911028','Cash on Delivery (COD)',2287.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 198 HOUR)),'completed','Paid cash on delivery',DATE_SUB(NOW(), INTERVAL 246 HOUR),DATE_SUB(NOW(), INTERVAL 198 HOUR)),
('REC-2026-S039',(SELECT id FROM users WHERE email='patrick.gonzales@seed.joeysfarm.test'),'Patrick Gonzales','97 Congressional Ave, Brgy. Bahay Toro, Quezon City','09280692566','Cash on Delivery (COD)',92.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 195 HOUR)),'completed','Left with guard',DATE_SUB(NOW(), INTERVAL 243 HOUR),DATE_SUB(NOW(), INTERVAL 195 HOUR)),
('REC-2026-S040',(SELECT id FROM users WHERE email='joanna.magno@seed.joeysfarm.test'),'Joanna Magno','102 Mindanao Ave, Brgy. Pasong Tamo, Quezon City','09063228088','Cash on Delivery (COD)',1653.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 14 HOUR)),'completed','Delivered',DATE_SUB(NOW(), INTERVAL 62 HOUR),DATE_SUB(NOW(), INTERVAL 14 HOUR)),
('REC-2026-S041',(SELECT id FROM users WHERE email='kenneth.sison@seed.joeysfarm.test'),'Kenneth Sison','68 Quirino Hwy, Brgy. Talipapa, Quezon City','09193004876','Cash on Delivery (COD)',828.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 4 HOUR)),'completed','Delivered',DATE_SUB(NOW(), INTERVAL 52 HOUR),DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('REC-2026-S042',(SELECT id FROM users WHERE email='trisha.javier@seed.joeysfarm.test'),'Trisha Javier','88 Aurora Blvd, Brgy. Cubao, Quezon City','09199128084','GCash',717.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 77 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 125 HOUR),DATE_SUB(NOW(), INTERVAL 77 HOUR)),
('REC-2026-S043',(SELECT id FROM users WHERE email='dennis.bustamante@seed.joeysfarm.test'),'Dennis Bustamante','221 Scout Borromeo St, Brgy. Laging Handa, Quezon City','09050037038','Cash on Delivery (COD)',828.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 7 HOUR)),'completed','Paid via GCash',DATE_SUB(NOW(), INTERVAL 55 HOUR),DATE_SUB(NOW(), INTERVAL 7 HOUR)),
('REC-2026-S044',(SELECT id FROM users WHERE email='rhea.corpuz@seed.joeysfarm.test'),'Rhea Corpuz','92 Don Antonio St, Brgy. Holy Spirit, Quezon City','09065384535','GCash',1308.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 275 HOUR)),'completed','Delivered',DATE_SUB(NOW(), INTERVAL 323 HOUR),DATE_SUB(NOW(), INTERVAL 275 HOUR)),
('REC-2026-S045',(SELECT id FROM users WHERE email='allan.fernandez@seed.joeysfarm.test'),'Allan Fernandez','40 Regalado Ave, Brgy. Fairview, Quezon City','09158794326','GCash',293.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 253 HOUR)),'cancelled','Cancelled by customer',DATE_SUB(NOW(), INTERVAL 301 HOUR),NULL),
('REC-2026-S046',(SELECT id FROM users WHERE email='marites.panganiban@seed.joeysfarm.test'),'Marites Panganiban','96 Maginhawa St, Teachers Village, Quezon City','09175860214','GCash',654.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 374 HOUR)),'cancelled','Cancelled by staff: unreachable',DATE_SUB(NOW(), INTERVAL 422 HOUR),NULL),
('REC-2026-S047',(SELECT id FROM users WHERE email='jericho.zamora@seed.joeysfarm.test'),'Jericho Zamora','147 Kamias Rd, Brgy. Kamuning, Quezon City','09282108394','Cash on Delivery (COD)',1035.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 170 HOUR)),'cancelled','Cancelled by staff: unreachable',DATE_SUB(NOW(), INTERVAL 218 HOUR),NULL),
('REC-2026-S048',(SELECT id FROM users WHERE email='liza.enriquez@seed.joeysfarm.test'),'Liza Enriquez','37 Tandang Sora Ave, Brgy. Culiat, Quezon City','09066882811','Cash on Delivery (COD)',195.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 392 HOUR)),'cancelled','Cancelled by customer',DATE_SUB(NOW(), INTERVAL 440 HOUR),NULL),
('REC-2026-S049',(SELECT id FROM users WHERE email='benedict.ilagan@seed.joeysfarm.test'),'Benedict Ilagan','42 Commonwealth Ave, Brgy. Holy Spirit, Quezon City','09065844093','Cash on Delivery (COD)',87.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 116 HOUR)),'cancelled','Cancelled by staff: unreachable',DATE_SUB(NOW(), INTERVAL 164 HOUR),NULL),
('REC-2026-S050',(SELECT id FROM users WHERE email='shiela.macaraeg@seed.joeysfarm.test'),'Shiela Macaraeg','217 Katipunan Ave, Brgy. Loyola Heights, Quezon City','09288452630','Cash on Delivery (COD)',390.00,0.00,DATE(DATE_SUB(NOW(), INTERVAL 448 HOUR)),'cancelled','Cancelled by customer',DATE_SUB(NOW(), INTERVAL 496 HOUR),NULL);

-- ---------- 3. Order items (prices copied from the products table) ----------
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,2 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S001';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,5 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S001';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,1 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S002';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,2 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S003';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,5 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S003';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,6 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S004';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,3 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S005';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,6 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S006';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,4 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S007';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S008';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,6 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S008';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,2 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S009';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,2 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S010';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S011';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,3 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S011';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S012';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,4 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S013';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,6 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S014';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,6 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S015';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,4 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S016';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S016';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,1 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S017';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,4 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S017';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,1 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S018';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,2 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S018';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S019';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,1 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S020';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,4 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S021';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S021';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,4 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S022';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,1 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S023';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,3 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S024';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S024';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S025';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,5 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S026';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,2 FROM orders o JOIN products p ON p.size_key='peewee' WHERE o.receipt_no='REC-2026-S026';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,2 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S026';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S027';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,2 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S028';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,5 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S028';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,5 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S029';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,3 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S029';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,6 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S030';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,4 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S030';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,1 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S031';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,6 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S032';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S032';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,2 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S032';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,2 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S033';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,4 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S033';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,3 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S034';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,6 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S034';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,6 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S035';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,5 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S035';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,1 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S036';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S037';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,4 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S037';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,6 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S038';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,4 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S038';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S038';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,1 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S039';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,4 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S040';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,1 FROM orders o JOIN products p ON p.size_key='jumbo' WHERE o.receipt_no='REC-2026-S040';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,3 FROM orders o JOIN products p ON p.size_key='small' WHERE o.receipt_no='REC-2026-S041';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,3 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S042';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,2 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S042';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,4 FROM orders o JOIN products p ON p.size_key='large' WHERE o.receipt_no='REC-2026-S043';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,4 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S044';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,36,p.price_36,1 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S045';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,3 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S046';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,5 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S047';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,5 FROM orders o JOIN products p ON p.size_key='extralarge' WHERE o.receipt_no='REC-2026-S047';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,1 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S048';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,12,p.price_12,1 FROM orders o JOIN products p ON p.size_key='peewee' WHERE o.receipt_no='REC-2026-S049';
INSERT INTO order_items (order_id,size_key,title,tray_size,unit_price,qty) SELECT o.id,p.size_key,p.title,24,p.price_24,2 FROM orders o JOIN products p ON p.size_key='medium' WHERE o.receipt_no='REC-2026-S050';

-- ---------- 4. Broken-egg return requests (6 pending, 5 approved, 3 rejected) ----------
-- image_file is NULL: staff will see 'No photo' (the upload folder is not part of a SQL import).
INSERT INTO egg_returns (user_id, order_id, size_key, broken_qty, discount_amount, credit_remaining, status, created_at, staff_message) VALUES
((SELECT id FROM users WHERE email='roberto.santiago@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S019'),'large',8,68.89,NULL,'pending',DATE_SUB(NOW(), INTERVAL 7 HOUR),NULL),
((SELECT id FROM users WHERE email='patricia.lim@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S020'),'medium',6,48.75,NULL,'pending',DATE_SUB(NOW(), INTERVAL 10 HOUR),NULL),
((SELECT id FROM users WHERE email='eduardo.tan@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S021'),'medium',9,73.12,NULL,'pending',DATE_SUB(NOW(), INTERVAL 2 HOUR),NULL),
((SELECT id FROM users WHERE email='eduardo.tan@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S021'),'large',11,94.88,NULL,'pending',DATE_SUB(NOW(), INTERVAL 6 HOUR),NULL),
((SELECT id FROM users WHERE email='cristina.go@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S022'),'extralarge',4,36.33,NULL,'pending',DATE_SUB(NOW(), INTERVAL 16 HOUR),NULL),
((SELECT id FROM users WHERE email='manuel.dizon@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S023'),'large',1,8.62,NULL,'pending',DATE_SUB(NOW(), INTERVAL 591 HOUR),NULL),
((SELECT id FROM users WHERE email='gloria.soriano@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S024'),'extralarge',2,18.17,NULL,'pending',DATE_SUB(NOW(), INTERVAL 425 HOUR),NULL),
((SELECT id FROM users WHERE email='gloria.soriano@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S024'),'jumbo',3,28.75,NULL,'pending',DATE_SUB(NOW(), INTERVAL 424 HOUR),NULL),
((SELECT id FROM users WHERE email='ricardo.manalo@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S025'),'large',11,94.42,94.42,'approved',DATE_SUB(NOW(), INTERVAL 952 HOUR),'Thank you for the clear photo. Your credit is ready for your next order and the replacement eggs are on the way.'),
((SELECT id FROM users WHERE email='angelica.esteban@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S026'),'jumbo',2,19.17,19.17,'approved',DATE_SUB(NOW(), INTERVAL 755 HOUR),'Thank you for the clear photo. Your credit is ready for your next order and the replacement eggs are on the way.'),
((SELECT id FROM users WHERE email='daniel.rivera@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S027'),'large',5,43.12,43.12,'approved',DATE_SUB(NOW(), INTERVAL 426 HOUR),'Approved. Replacement will be delivered within 2 days.'),
((SELECT id FROM users WHERE email='jasmine.ocampo@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S028'),'large',4,34.33,34.33,'approved',DATE_SUB(NOW(), INTERVAL 6 HOUR),'Approved. Replacement will be delivered within 2 days.'),
((SELECT id FROM users WHERE email='mark.valdez@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S029'),'jumbo',1,9.58,9.58,'approved',DATE_SUB(NOW(), INTERVAL 10 HOUR),'Thank you for the clear photo. Your credit is ready for your next order and the replacement eggs are on the way.'),
((SELECT id FROM users WHERE email='kristine.cabrera@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S030'),'extralarge',10,90.83,0.00,'rejected',DATE_SUB(NOW(), INTERVAL 1250 HOUR),'The photo does not clearly show broken eggs, so we could not approve this report.'),
((SELECT id FROM users WHERE email='kristine.cabrera@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S030'),'large',11,94.72,0.00,'rejected',DATE_SUB(NOW(), INTERVAL 1250 HOUR),'Report rejected: damage not visible in the attached image.'),
((SELECT id FROM users WHERE email='joshua.mercado@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S031'),'medium',8,65.11,0.00,'rejected',DATE_SUB(NOW(), INTERVAL 129 HOUR),'Eggs in the photo look intact. Please contact us if you have another photo.'),
((SELECT id FROM users WHERE email='bianca.padilla@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S032'),'small',2,15.33,0.00,'rejected',DATE_SUB(NOW(), INTERVAL 186 HOUR),'Report rejected: damage not visible in the attached image.'),
((SELECT id FROM users WHERE email='bianca.padilla@seed.joeysfarm.test'),(SELECT id FROM orders WHERE receipt_no='REC-2026-S032'),'large',12,103.50,0.00,'rejected',DATE_SUB(NOW(), INTERVAL 188 HOUR),'Eggs in the photo look intact. Please contact us if you have another photo.');


-- ---------- 5. Replacement orders for approved returns ----------

-- Replacement 1: Ricardo Manalo
SET @return_id = (
    SELECT er.id
    FROM egg_returns er
    JOIN orders original_order ON original_order.id = er.order_id
    WHERE original_order.receipt_no = 'REC-2026-S025'
      AND er.size_key = 'large'
    LIMIT 1
);

INSERT INTO orders (
    receipt_no, user_id, customer_name, address, contact,
    payment, total, discount_total, delivery_date, status,
    remark, created_at, completed_at, return_id
)
VALUES (
    'RPL-2026-S01',
    (SELECT id FROM users WHERE email = 'ricardo.manalo@seed.joeysfarm.test'),
    'Ricardo Manalo',
    '128 Mindanao Ave, Brgy. Pasong Tamo, Quezon City',
    '09186425247',
    'Replacement (no charge)', 0, 0,
    DATE(DATE_ADD(NOW(), INTERVAL 2 DAY)),
    'replacement',
    '11 eggs will be redelivered (replacement for REC-2026-S025)',
    DATE_SUB(NOW(), INTERVAL 950 HOUR),
    NULL, @return_id
);

INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty)
SELECT id, 'large', 'Large', 1, 0, 11
FROM orders WHERE receipt_no = 'RPL-2026-S01';


-- Replacement 2: Angelica Esteban
SET @return_id = (
    SELECT er.id
    FROM egg_returns er
    JOIN orders original_order ON original_order.id = er.order_id
    WHERE original_order.receipt_no = 'REC-2026-S026'
      AND er.size_key = 'jumbo'
    LIMIT 1
);

INSERT INTO orders (
    receipt_no, user_id, customer_name, address, contact,
    payment, total, discount_total, delivery_date, status,
    remark, created_at, completed_at, return_id
)
VALUES (
    'RPL-2026-S02',
    (SELECT id FROM users WHERE email = 'angelica.esteban@seed.joeysfarm.test'),
    'Angelica Esteban',
    '31 Quirino Hwy, Brgy. Talipapa, Quezon City',
    '09064725877',
    'Replacement (no charge)', 0, 0,
    DATE(DATE_ADD(NOW(), INTERVAL 2 DAY)),
    'replacement',
    '2 eggs will be redelivered (replacement for REC-2026-S026)',
    DATE_SUB(NOW(), INTERVAL 753 HOUR),
    NULL, @return_id
);

INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty)
SELECT id, 'jumbo', 'Jumbo', 1, 0, 2
FROM orders WHERE receipt_no = 'RPL-2026-S02';


-- Replacement 3: Daniel Rivera
SET @return_id = (
    SELECT er.id
    FROM egg_returns er
    JOIN orders original_order ON original_order.id = er.order_id
    WHERE original_order.receipt_no = 'REC-2026-S027'
      AND er.size_key = 'large'
    LIMIT 1
);

INSERT INTO orders (
    receipt_no, user_id, customer_name, address, contact,
    payment, total, discount_total, delivery_date, status,
    remark, created_at, completed_at, return_id
)
VALUES (
    'RPL-2026-S03',
    (SELECT id FROM users WHERE email = 'daniel.rivera@seed.joeysfarm.test'),
    'Daniel Rivera',
    '105 Aurora Blvd, Brgy. Cubao, Quezon City',
    '09281330175',
    'Replacement (no charge)', 0, 0,
    DATE(DATE_ADD(NOW(), INTERVAL 2 DAY)),
    'replacement',
    '5 eggs will be redelivered (replacement for REC-2026-S027)',
    DATE_SUB(NOW(), INTERVAL 424 HOUR),
    NULL, @return_id
);

INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty)
SELECT id, 'large', 'Large', 1, 0, 5
FROM orders WHERE receipt_no = 'RPL-2026-S03';


-- Replacement 4: Jasmine Ocampo
SET @return_id = (
    SELECT er.id
    FROM egg_returns er
    JOIN orders original_order ON original_order.id = er.order_id
    WHERE original_order.receipt_no = 'REC-2026-S028'
      AND er.size_key = 'large'
    LIMIT 1
);

INSERT INTO orders (
    receipt_no, user_id, customer_name, address, contact,
    payment, total, discount_total, delivery_date, status,
    remark, created_at, completed_at, return_id
)
VALUES (
    'RPL-2026-S04',
    (SELECT id FROM users WHERE email = 'jasmine.ocampo@seed.joeysfarm.test'),
    'Jasmine Ocampo',
    '56 Scout Borromeo St, Brgy. Laging Handa, Quezon City',
    '09190525898',
    'Replacement (no charge)', 0, 0,
    DATE(NOW()),
    'completed',
    '4 eggs will be redelivered (replacement for REC-2026-S028)',
    DATE_SUB(NOW(), INTERVAL 4 HOUR),
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    @return_id
);

INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty)
SELECT id, 'large', 'Large', 1, 0, 4
FROM orders WHERE receipt_no = 'RPL-2026-S04';


-- Replacement 5: Mark Valdez
SET @return_id = (
    SELECT er.id
    FROM egg_returns er
    JOIN orders original_order ON original_order.id = er.order_id
    WHERE original_order.receipt_no = 'REC-2026-S029'
      AND er.size_key = 'jumbo'
    LIMIT 1
);

INSERT INTO orders (
    receipt_no, user_id, customer_name, address, contact,
    payment, total, discount_total, delivery_date, status,
    remark, created_at, completed_at, return_id
)
VALUES (
    'RPL-2026-S05',
    (SELECT id FROM users WHERE email = 'mark.valdez@seed.joeysfarm.test'),
    'Mark Valdez',
    '172 Don Antonio St, Brgy. Holy Spirit, Quezon City',
    '09288939494',
    'Replacement (no charge)', 0, 0,
    DATE(NOW()),
    'completed',
    '1 egg will be redelivered (replacement for REC-2026-S029)',
    DATE_SUB(NOW(), INTERVAL 8 HOUR),
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    @return_id
);

INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty)
SELECT id, 'jumbo', 'Jumbo', 1, 0, 1
FROM orders WHERE receipt_no = 'RPL-2026-S05';

-- ---------- 6. Customer messages (50 different senders: 20 unread, 20 read, 10 archived) ----------
INSERT INTO contact_messages (user_id, sender_name, sender_email, message, status, created_at, read_at) VALUES
((SELECT id FROM users WHERE email='maria.santos@seed.joeysfarm.test'),'Maria Santos','maria.santos@seed.joeysfarm.test','Hi! Do you deliver to Fairview? I would like to order 10 trays weekly.','unread',DATE_SUB(NOW(), INTERVAL 939 HOUR),NULL),
((SELECT id FROM users WHERE email='juan.delacruz@seed.joeysfarm.test'),'Juan Dela Cruz','juan.delacruz@seed.joeysfarm.test','Salamat po, sariwa ang mga itlog na natanggap namin kahapon!','read',DATE_SUB(NOW(), INTERVAL 1209 HOUR),DATE_SUB(NOW(), INTERVAL 1205 HOUR)),
((SELECT id FROM users WHERE email='jose.reyes@seed.joeysfarm.test'),'Jose Reyes','jose.reyes@seed.joeysfarm.test','Can I change my delivery address for my pending order?','archived',DATE_SUB(NOW(), INTERVAL 497 HOUR),DATE_SUB(NOW(), INTERVAL 481 HOUR)),
((SELECT id FROM users WHERE email='ana.garcia@seed.joeysfarm.test'),'Ana Garcia','ana.garcia@seed.joeysfarm.test','Do you offer discounts for bulk orders of 50 trays or more?','unread',DATE_SUB(NOW(), INTERVAL 326 HOUR),NULL),
((SELECT id FROM users WHERE email='pedro.ramos@seed.joeysfarm.test'),'Pedro Ramos','pedro.ramos@seed.joeysfarm.test','My GCash payment was deducted but the order still shows pending.','unread',DATE_SUB(NOW(), INTERVAL 1244 HOUR),NULL),
((SELECT id FROM users WHERE email='carmen.mendoza@seed.joeysfarm.test'),'Carmen Mendoza','carmen.mendoza@seed.joeysfarm.test','Good morning, what time do your riders usually arrive?','read',DATE_SUB(NOW(), INTERVAL 1030 HOUR),DATE_SUB(NOW(), INTERVAL 1014 HOUR)),
((SELECT id FROM users WHERE email='luis.torres@seed.joeysfarm.test'),'Luis Torres','luis.torres@seed.joeysfarm.test','Are your eggs free of antibiotics? I need this for my bakery.','read',DATE_SUB(NOW(), INTERVAL 232 HOUR),DATE_SUB(NOW(), INTERVAL 229 HOUR)),
((SELECT id FROM users WHERE email='rosa.flores@seed.joeysfarm.test'),'Rosa Flores','rosa.flores@seed.joeysfarm.test','Please add Jumbo eggs to the next batch, my customers keep asking.','unread',DATE_SUB(NOW(), INTERVAL 261 HOUR),NULL),
((SELECT id FROM users WHERE email='miguel.castillo@seed.joeysfarm.test'),'Miguel Castillo','miguel.castillo@seed.joeysfarm.test','Nag-order ako ng large pero medium ang dumating po.','read',DATE_SUB(NOW(), INTERVAL 9 HOUR),DATE_SUB(NOW(), INTERVAL 0 HOUR)),
((SELECT id FROM users WHERE email='elena.villanueva@seed.joeysfarm.test'),'Elena Villanueva','elena.villanueva@seed.joeysfarm.test','How long can I keep the eggs in the fridge?','read',DATE_SUB(NOW(), INTERVAL 1081 HOUR),DATE_SUB(NOW(), INTERVAL 1071 HOUR)),
((SELECT id FROM users WHERE email='antonio.bautista@seed.joeysfarm.test'),'Antonio Bautista','antonio.bautista@seed.joeysfarm.test','Can I schedule recurring weekly deliveries?','read',DATE_SUB(NOW(), INTERVAL 303 HOUR),DATE_SUB(NOW(), INTERVAL 289 HOUR)),
((SELECT id FROM users WHERE email='sofia.aquino@seed.joeysfarm.test'),'Sofia Aquino','sofia.aquino@seed.joeysfarm.test','The rider was very polite, thank you!','archived',DATE_SUB(NOW(), INTERVAL 517 HOUR),DATE_SUB(NOW(), INTERVAL 516 HOUR)),
((SELECT id FROM users WHERE email='ramon.cruz@seed.joeysfarm.test'),'Ramon Cruz','ramon.cruz@seed.joeysfarm.test','I would like to become a reseller. What are the requirements?','archived',DATE_SUB(NOW(), INTERVAL 910 HOUR),DATE_SUB(NOW(), INTERVAL 890 HOUR)),
((SELECT id FROM users WHERE email='teresa.navarro@seed.joeysfarm.test'),'Teresa Navarro','teresa.navarro@seed.joeysfarm.test','Hindi ko po ma-update ang contact number ko sa profile.','read',DATE_SUB(NOW(), INTERVAL 606 HOUR),DATE_SUB(NOW(), INTERVAL 601 HOUR)),
((SELECT id FROM users WHERE email='carlos.domingo@seed.joeysfarm.test'),'Carlos Domingo','carlos.domingo@seed.joeysfarm.test','Is pick-up at the farm possible on Sundays?','unread',DATE_SUB(NOW(), INTERVAL 781 HOUR),NULL),
((SELECT id FROM users WHERE email='isabel.salazar@seed.joeysfarm.test'),'Isabel Salazar','isabel.salazar@seed.joeysfarm.test','Do you have peewee eggs in stock this week?','unread',DATE_SUB(NOW(), INTERVAL 1298 HOUR),NULL),
((SELECT id FROM users WHERE email='fernando.aguilar@seed.joeysfarm.test'),'Fernando Aguilar','fernando.aguilar@seed.joeysfarm.test','I received two cracked eggs in my last tray. How do I report it?','archived',DATE_SUB(NOW(), INTERVAL 1281 HOUR),DATE_SUB(NOW(), INTERVAL 1280 HOUR)),
((SELECT id FROM users WHERE email='lourdes.pascual@seed.joeysfarm.test'),'Lourdes Pascual','lourdes.pascual@seed.joeysfarm.test','Can you issue an official receipt for my company?','read',DATE_SUB(NOW(), INTERVAL 910 HOUR),DATE_SUB(NOW(), INTERVAL 891 HOUR)),
((SELECT id FROM users WHERE email='roberto.santiago@seed.joeysfarm.test'),'Roberto Santiago','roberto.santiago@seed.joeysfarm.test','Maraming salamat sa mabilis na delivery!','archived',DATE_SUB(NOW(), INTERVAL 249 HOUR),DATE_SUB(NOW(), INTERVAL 245 HOUR)),
((SELECT id FROM users WHERE email='patricia.lim@seed.joeysfarm.test'),'Patricia Lim','patricia.lim@seed.joeysfarm.test','What payment methods do you accept besides COD and GCash?','read',DATE_SUB(NOW(), INTERVAL 466 HOUR),DATE_SUB(NOW(), INTERVAL 455 HOUR)),
((SELECT id FROM users WHERE email='eduardo.tan@seed.joeysfarm.test'),'Eduardo Tan','eduardo.tan@seed.joeysfarm.test','Is it possible to order for next week''s party, 20 trays of large?','unread',DATE_SUB(NOW(), INTERVAL 909 HOUR),NULL),
((SELECT id FROM users WHERE email='cristina.go@seed.joeysfarm.test'),'Cristina Go','cristina.go@seed.joeysfarm.test','My order was delivered to the wrong unit. Please advise.','read',DATE_SUB(NOW(), INTERVAL 140 HOUR),DATE_SUB(NOW(), INTERVAL 127 HOUR)),
((SELECT id FROM users WHERE email='manuel.dizon@seed.joeysfarm.test'),'Manuel Dizon','manuel.dizon@seed.joeysfarm.test','Do you sell salted eggs or only fresh eggs?','unread',DATE_SUB(NOW(), INTERVAL 561 HOUR),NULL),
((SELECT id FROM users WHERE email='gloria.soriano@seed.joeysfarm.test'),'Gloria Soriano','gloria.soriano@seed.joeysfarm.test','Can I get a receipt copy sent to my email?','unread',DATE_SUB(NOW(), INTERVAL 899 HOUR),NULL),
((SELECT id FROM users WHERE email='ricardo.manalo@seed.joeysfarm.test'),'Ricardo Manalo','ricardo.manalo@seed.joeysfarm.test','Are the hens really pasture-raised? Do you allow farm visits?','unread',DATE_SUB(NOW(), INTERVAL 910 HOUR),NULL),
((SELECT id FROM users WHERE email='angelica.esteban@seed.joeysfarm.test'),'Angelica Esteban','angelica.esteban@seed.joeysfarm.test','Please remind your rider to call before arriving.','read',DATE_SUB(NOW(), INTERVAL 610 HOUR),DATE_SUB(NOW(), INTERVAL 601 HOUR)),
((SELECT id FROM users WHERE email='daniel.rivera@seed.joeysfarm.test'),'Daniel Rivera','daniel.rivera@seed.joeysfarm.test','Great quality eggs, the yolks are really golden.','unread',DATE_SUB(NOW(), INTERVAL 914 HOUR),NULL),
((SELECT id FROM users WHERE email='jasmine.ocampo@seed.joeysfarm.test'),'Jasmine Ocampo','jasmine.ocampo@seed.joeysfarm.test','Why was my order cancelled? I did not request this.','read',DATE_SUB(NOW(), INTERVAL 1274 HOUR),DATE_SUB(NOW(), INTERVAL 1260 HOUR)),
((SELECT id FROM users WHERE email='mark.valdez@seed.joeysfarm.test'),'Mark Valdez','mark.valdez@seed.joeysfarm.test','Is there a minimum order amount for delivery?','archived',DATE_SUB(NOW(), INTERVAL 962 HOUR),DATE_SUB(NOW(), INTERVAL 952 HOUR)),
((SELECT id FROM users WHERE email='kristine.cabrera@seed.joeysfarm.test'),'Kristine Cabrera','kristine.cabrera@seed.joeysfarm.test','Pwede po ba magpa-deliver sa Cainta?','archived',DATE_SUB(NOW(), INTERVAL 642 HOUR),DATE_SUB(NOW(), INTERVAL 636 HOUR)),
((SELECT id FROM users WHERE email='joshua.mercado@seed.joeysfarm.test'),'Joshua Mercado','joshua.mercado@seed.joeysfarm.test','The 12-egg tray I received had only 11 eggs.','archived',DATE_SUB(NOW(), INTERVAL 209 HOUR),DATE_SUB(NOW(), INTERVAL 189 HOUR)),
((SELECT id FROM users WHERE email='bianca.padilla@seed.joeysfarm.test'),'Bianca Padilla','bianca.padilla@seed.joeysfarm.test','I forgot my password, can you reset it for me?','archived',DATE_SUB(NOW(), INTERVAL 1123 HOUR),DATE_SUB(NOW(), INTERVAL 1122 HOUR)),
((SELECT id FROM users WHERE email='nathan.velasco@seed.joeysfarm.test'),'Nathan Velasco','nathan.velasco@seed.joeysfarm.test','Do you accept returns for eggs near expiry?','read',DATE_SUB(NOW(), INTERVAL 419 HOUR),DATE_SUB(NOW(), INTERVAL 412 HOUR)),
((SELECT id FROM users WHERE email='camille.roxas@seed.joeysfarm.test'),'Camille Roxas','camille.roxas@seed.joeysfarm.test','Can I combine two pending orders into one delivery?','unread',DATE_SUB(NOW(), INTERVAL 604 HOUR),NULL),
((SELECT id FROM users WHERE email='gabriel.evangelista@seed.joeysfarm.test'),'Gabriel Evangelista','gabriel.evangelista@seed.joeysfarm.test','What is the expiry date of the eggs you deliver?','archived',DATE_SUB(NOW(), INTERVAL 827 HOUR),DATE_SUB(NOW(), INTERVAL 819 HOUR)),
((SELECT id FROM users WHERE email='danica.lacson@seed.joeysfarm.test'),'Danica Lacson','danica.lacson@seed.joeysfarm.test','Happy to recommend you to my neighbors, keep it up!','unread',DATE_SUB(NOW(), INTERVAL 1362 HOUR),NULL),
((SELECT id FROM users WHERE email='vincent.alvarez@seed.joeysfarm.test'),'Vincent Alvarez','vincent.alvarez@seed.joeysfarm.test','Can I pay half now and half upon delivery?','read',DATE_SUB(NOW(), INTERVAL 667 HOUR),DATE_SUB(NOW(), INTERVAL 661 HOUR)),
((SELECT id FROM users WHERE email='hazel.tolentino@seed.joeysfarm.test'),'Hazel Tolentino','hazel.tolentino@seed.joeysfarm.test','Please send a menu of your tray prices.','read',DATE_SUB(NOW(), INTERVAL 208 HOUR),DATE_SUB(NOW(), INTERVAL 200 HOUR)),
((SELECT id FROM users WHERE email='patrick.gonzales@seed.joeysfarm.test'),'Patrick Gonzales','patrick.gonzales@seed.joeysfarm.test','I want to cancel my confirmed order, is it still possible?','unread',DATE_SUB(NOW(), INTERVAL 789 HOUR),NULL),
((SELECT id FROM users WHERE email='joanna.magno@seed.joeysfarm.test'),'Joanna Magno','joanna.magno@seed.joeysfarm.test','Do you have organic certification?','read',DATE_SUB(NOW(), INTERVAL 264 HOUR),DATE_SUB(NOW(), INTERVAL 244 HOUR)),
((SELECT id FROM users WHERE email='kenneth.sison@seed.joeysfarm.test'),'Kenneth Sison','kenneth.sison@seed.joeysfarm.test','Delivery was delayed by a day. Any update on my order?','unread',DATE_SUB(NOW(), INTERVAL 687 HOUR),NULL),
((SELECT id FROM users WHERE email='trisha.javier@seed.joeysfarm.test'),'Trisha Javier','trisha.javier@seed.joeysfarm.test','Can I order half a tray?','read',DATE_SUB(NOW(), INTERVAL 1321 HOUR),DATE_SUB(NOW(), INTERVAL 1303 HOUR)),
((SELECT id FROM users WHERE email='dennis.bustamante@seed.joeysfarm.test'),'Dennis Bustamante','dennis.bustamante@seed.joeysfarm.test','Pasensya na po, mali ang address na nailagay ko sa order.','unread',DATE_SUB(NOW(), INTERVAL 809 HOUR),NULL),
((SELECT id FROM users WHERE email='rhea.corpuz@seed.joeysfarm.test'),'Rhea Corpuz','rhea.corpuz@seed.joeysfarm.test','Ask lang po kung may extra large pa kayo.','read',DATE_SUB(NOW(), INTERVAL 426 HOUR),DATE_SUB(NOW(), INTERVAL 406 HOUR)),
((SELECT id FROM users WHERE email='allan.fernandez@seed.joeysfarm.test'),'Allan Fernandez','allan.fernandez@seed.joeysfarm.test','Can you deliver before 7am? I run a breakfast stall.','read',DATE_SUB(NOW(), INTERVAL 1125 HOUR),DATE_SUB(NOW(), INTERVAL 1115 HOUR)),
((SELECT id FROM users WHERE email='marites.panganiban@seed.joeysfarm.test'),'Marites Panganiban','marites.panganiban@seed.joeysfarm.test','Do you provide egg cartons for reselling?','unread',DATE_SUB(NOW(), INTERVAL 1112 HOUR),NULL),
((SELECT id FROM users WHERE email='jericho.zamora@seed.joeysfarm.test'),'Jericho Zamora','jericho.zamora@seed.joeysfarm.test','The eggs were smaller than I expected for the large size.','unread',DATE_SUB(NOW(), INTERVAL 1103 HOUR),NULL),
((SELECT id FROM users WHERE email='liza.enriquez@seed.joeysfarm.test'),'Liza Enriquez','liza.enriquez@seed.joeysfarm.test','Thank you for the replacement eggs, all good now!','read',DATE_SUB(NOW(), INTERVAL 775 HOUR),DATE_SUB(NOW(), INTERVAL 766 HOUR)),
((SELECT id FROM users WHERE email='benedict.ilagan@seed.joeysfarm.test'),'Benedict Ilagan','benedict.ilagan@seed.joeysfarm.test','Is GCash payment required before delivery?.','unread',DATE_SUB(NOW(), INTERVAL 712 HOUR),NULL),
((SELECT id FROM users WHERE email='shiela.macaraeg@seed.joeysfarm.test'),'Shiela Macaraeg','shiela.macaraeg@seed.joeysfarm.test','I love your website, very easy to order. Thanks!','unread',DATE_SUB(NOW(), INTERVAL 927 HOUR),NULL);

-- ---------- 7. Inventory (stored in EGGS, same numbers as staff.html; broken log includes approved returns) ----------
INSERT INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES
('peewee',36,720,72,36),
('small',36,1440,180,72),
('medium',36,10800,1440,360),
('large',36,16200,1260,560),
('extralarge',24,4800,360,120),
('jumbo',36,3960,288,75)
ON DUPLICATE KEY UPDATE tray_size=VALUES(tray_size), fresh=VALUES(fresh), near_expiry=VALUES(near_expiry), unsellable=VALUES(unsellable);

-- Quick check:
-- SELECT status, COUNT(*) FROM orders WHERE receipt_no LIKE '%-S%' GROUP BY status;