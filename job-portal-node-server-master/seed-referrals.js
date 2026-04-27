const mongoose = require('mongoose');
const referralModel = require('./models/referral/referral.model.server');
const seedReferrals = require('./utils/seed-referrals.json');

async function seedReferralData() {
  try {
    // Connect to MongoDB
    const connectionString = 'mongodb+srv://aditya:k353OKjCl6XfGw13@cluster0.cvuu6yu.mongodb.net/?retryWrites=true&w=majority';
    await mongoose.connect(connectionString, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    
    console.log('Connected to MongoDB');

    // Clear existing referrals (optional)
    // await referralModel.deleteMany({});
    // console.log('Cleared existing referrals');

    // Seed referral data
    for (const referralData of seedReferrals) {
      try {
        const existingReferral = await referralModel.findReferralByCode(referralData.code);
        if (!existingReferral) {
          await referralModel.createReferral(referralData);
          console.log(`✅ Created referral: ${referralData.code} for ${referralData.partnerName}`);
        } else {
          console.log(`⚠️  Referral ${referralData.code} already exists, skipping...`);
        }
      } catch (error) {
        console.error(`❌ Error creating referral ${referralData.code}:`, error.message);
      }
    }

    console.log('🎉 Referral seeding completed!');
    
    // Display summary
    const allReferrals = await referralModel.findAllReferrals();
    console.log(`\n📊 Summary:`);
    console.log(`Total referrals: ${allReferrals.length}`);
    console.log(`Active referrals: ${allReferrals.filter(r => r.isActive).length}`);
    
    allReferrals.forEach(referral => {
      console.log(`- ${referral.code}: ${referral.partnerName} (${referral.offerType}) - ${referral.usageCount}/${referral.maxUses} uses`);
    });

  } catch (error) {
    console.error('❌ Error seeding referral data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedReferralData();
