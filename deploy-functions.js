const { execSync } = require('child_process');

console.log('Deploying updated Edge Functions to Supabase...');

// Deploy the create-promotion-payment function
try {
  console.log('\nDeploying create-promotion-payment function...');
  execSync('npx supabase functions deploy create-promotion-payment', { stdio: 'inherit' });
  console.log('✅ create-promotion-payment function deployed successfully!');
} catch (error) {
  console.error('❌ Error deploying create-promotion-payment function:', error.message);
}

// Deploy the stripe-webhook function
try {
  console.log('\nDeploying stripe-webhook function...');
  execSync('npx supabase functions deploy stripe-webhook', { stdio: 'inherit' });
  console.log('✅ stripe-webhook function deployed successfully!');
} catch (error) {
  console.error('❌ Error deploying stripe-webhook function:', error.message);
}

console.log('\n🎉 All functions deployed! You may need to login to Supabase CLI first if prompted.');
console.log('Run this script with: node deploy-functions.js'); 