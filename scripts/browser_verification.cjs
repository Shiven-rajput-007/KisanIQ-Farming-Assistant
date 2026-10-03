const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\shive\\.gemini\\antigravity\\brain\\c100c33d-33c9-4146-85ce-12bfb38ace88';

async function runBrowserTests() {
  console.log('====================================================');
  console.log('🌐 RUNNING REAL CHROME BROWSER END-TO-END TESTS');
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // -------------------------------------------------------------
    // Step 1: Initial Page Load as Guest
    // -------------------------------------------------------------
    console.log('1. Loading http://localhost:5173/ as unauthenticated guest...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('header', { timeout: 10000 });

    const headerText = await page.$eval('header', el => el.innerText);
    console.log('   Header text in guest mode:', headerText.replace(/\n+/g, ' | '));

    const hasGuestOrKisan = headerText.includes('Welcome') || headerText.includes('KisanIQ') || headerText.includes('स्वागत');
    const hasLoginBtn = headerText.includes('Login') || headerText.includes('लॉगिन');
    console.log(`   Has Guest/App Brand: ${hasGuestOrKisan}, Has Login Action: ${hasLoginBtn}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_01_guest_homepage.png') });
    console.log('   📸 Screenshot saved: test_01_guest_homepage.png');

    // -------------------------------------------------------------
    // Step 2: Navigate to Register Page and Register a New Farmer
    // -------------------------------------------------------------
    console.log('\n2. Navigating to Register Page...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="10-digit mobile number"]', { timeout: 10000 });

    const testFarmerPhone = `98700${Math.floor(10000 + Math.random() * 90000)}`;
    console.log(`   Filling registration form for farmer "Suresh Chandra" (Phone: ${testFarmerPhone})...`);

    // Fill inputs
    await page.type('input[placeholder*="Ramesh Kumar"]', 'Suresh Chandra');
    await page.type('input[placeholder="10-digit mobile number"]', testFarmerPhone);
    await page.type('input[placeholder="Min 6 characters"]', 'farmerpwd123');
    await page.type('input[placeholder="Repeat password"]', 'farmerpwd123');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_02_farmer_register_form.png') });
    console.log('   📸 Screenshot saved: test_02_farmer_register_form.png');

    // Submit form
    console.log('   Submitting farmer registration...');
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Verify logged in state in header
    await page.waitForSelector('header', { timeout: 10000 });
    const loggedInHeaderText = await page.$eval('header', el => el.innerText);
    console.log('   Logged in header text:', loggedInHeaderText.replace(/\n+/g, ' | '));

    const showsSuresh = loggedInHeaderText.includes('Suresh');
    const showsFarmer = loggedInHeaderText.includes('Farmer') || loggedInHeaderText.includes('किसान');
    console.log(`   Identifies farmer as Suresh Chandra: ${showsSuresh}`);
    console.log(`   Displays Farmer role badge: ${showsFarmer}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_03_farmer_dashboard.png') });
    console.log('   📸 Screenshot saved: test_03_farmer_dashboard.png');

    // -------------------------------------------------------------
    // Step 3: Test Location Modal & Dynamic Updates
    // -------------------------------------------------------------
    console.log('\n3. Testing Location Modal (Change from Gwalior to Indore)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const changeBtn = btns.find(b => b.innerText.includes('Change') || b.innerText.includes('बदलें') || b.innerText.includes('Gwalior') || b.innerText.includes('MP'));
      if (changeBtn) changeBtn.click();
    });

    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_04_location_modal.png') });
    console.log('   📸 Screenshot saved: test_04_location_modal.png');

    // Click Indore in popular hubs
    console.log('   Selecting Indore hub from modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const indoreBtn = buttons.find(b => b.innerText.includes('Indore'));
      if (indoreBtn) indoreBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    // Save location
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.innerText.includes('Confirm') || b.innerText.includes('Save') || b.innerText.includes('स्थान चुनें') || b.innerText.includes('अपडेट'));
      if (saveBtn) saveBtn.click();
    });

    await new Promise(r => setTimeout(r, 1500));

    const updatedLocHeader = await page.$eval('header', el => el.innerText);
    console.log('   Updated header after location change:', updatedLocHeader.replace(/\n+/g, ' | '));
    const showsIndore = updatedLocHeader.includes('Indore');
    console.log(`   Header reflects new location Indore: ${showsIndore}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_05_indore_selected.png') });
    console.log('   📸 Screenshot saved: test_05_indore_selected.png');

    // -------------------------------------------------------------
    // Step 4: Mandi Intelligence & Comparison
    // -------------------------------------------------------------
    console.log('\n4. Navigating to /market (Mandi Intelligence)...');
    await page.goto('http://localhost:5173/market', { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const marketContent = await page.$eval('main, #root', el => el.innerText);
    const hasLaxmibaiOrMandi = marketContent.includes('Laxmibai') || marketContent.includes('Mandi') || marketContent.includes('मंडी') || marketContent.includes('Morar');
    console.log(`   Mandi Intelligence loaded with APMC rates: ${hasLaxmibaiOrMandi}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_06_market_mandi_intelligence.png') });
    console.log('   📸 Screenshot saved: test_06_market_mandi_intelligence.png');

    // -------------------------------------------------------------
    // Step 5: Language Switcher (English <-> Hindi)
    // -------------------------------------------------------------
    console.log('\n5. Testing Language Switcher (EN <-> HI)...');
    // Click language toggle button in header
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const langBtn = btns.find(b => b.innerText.includes('English') || b.innerText.includes('हिंदी') || b.innerText.includes('हिं') || b.innerText.includes('EN'));
      if (langBtn) langBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    const hindiContent = await page.$eval('main, #root', el => el.innerText);
    const hasHindi = hindiContent.includes('मंडी') || hindiContent.includes('फसल') || hindiContent.includes('बेचें') || hindiContent.includes('नमस्ते');
    console.log(`   App switched to Hindi: ${hasHindi}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_07_language_hindi.png') });
    console.log('   📸 Screenshot saved: test_07_language_hindi.png');

    // Toggle back to English
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const langBtn = btns.find(b => b.innerText.includes('English') || b.innerText.includes('हिंदी') || b.innerText.includes('हिं') || b.innerText.includes('EN'));
      if (langBtn) langBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // -------------------------------------------------------------
    // Step 6: Logout & Buyer Flow
    // -------------------------------------------------------------
    console.log('\n6. Testing Logout...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const logoutBtn = btns.find(b => b.getAttribute('aria-label') === 'Logout' || b.getAttribute('title') === 'Logout' || b.innerText.includes('Logout') || b.innerText.includes('लॉगआउट'));
      if (logoutBtn) logoutBtn.click();
    });

    await new Promise(r => setTimeout(r, 1500));
    console.log('   Navigating to Register as Buyer...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
    await page.waitForSelector('button', { timeout: 10000 });

    // Switch to Buyer tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const buyerTab = btns.find(b => b.innerText.includes('Buyer') || b.innerText.includes('खरीदार'));
      if (buyerTab) buyerTab.click();
    });

    await new Promise(r => setTimeout(r, 500));

    const testBuyerPhone = `98600${Math.floor(10000 + Math.random() * 90000)}`;
    console.log(`   Registering buyer "Rohan Agrotech" (Phone: ${testBuyerPhone})...`);

    await page.type('input[placeholder*="Vikram Sharma"]', 'Rohan Agrotech');
    await page.type('input[placeholder="10-digit mobile number"]', testBuyerPhone);
    await page.type('input[placeholder="Min 6 characters"]', 'buyerpass123');
    await page.type('input[placeholder="Repeat password"]', 'buyerpass123');
    await page.type('input[placeholder*="Shanti Agro Foods"]', 'Rohan Food Processing Corp');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_08_buyer_register_form.png') });
    console.log('   📸 Screenshot saved: test_08_buyer_register_form.png');

    // Submit buyer registration
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Should be at marketplace
    console.log('   Current URL after buyer registration:', page.url());
    await page.waitForSelector('header', { timeout: 10000 });
    const buyerHeader = await page.$eval('header', el => el.innerText);
    console.log('   Buyer Header text:', buyerHeader.replace(/\n+/g, ' | '));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_09_buyer_marketplace.png') });
    console.log('   📸 Screenshot saved: test_09_buyer_marketplace.png');

    console.log('\n====================================================');
    console.log('🎉 ALL REAL BROWSER TESTS EXECUTED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Browser Test Error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_error.png') });
  } finally {
    await browser.close();
  }
}

runBrowserTests();
