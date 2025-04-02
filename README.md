# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/dae41fd1-06fa-4c8e-ab91-6e09a0dd810f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/dae41fd1-06fa-4c8e-ab91-6e09a0dd810f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/dae41fd1-06fa-4c8e-ab91-6e09a0dd810f) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

# Venturezon

## Setting Up Payment Methods

To use the payment features in the application, you need to set up the `payment_methods` table in your Supabase database.

### Option 1: Run the provided SQL script directly in Supabase

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Create a new query and paste the following SQL:

```sql
-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Add RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy for users to only see their own payment methods
CREATE POLICY "Users can view their own payment methods"
  ON payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own payment methods
CREATE POLICY "Users can update their own payment methods"
  ON payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for users to delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
  ON payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods (user_id);
```

4. Run the query

### Option 2: Install additional dependencies and run the script

1. Install the required dependencies:

```bash
npm install dotenv @supabase/supabase-js ts-node --save-dev
```

2. Create a `.env` file in your project root and add your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

3. Run the migration script:

```bash
npm run db:create-payment-methods
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Payment Method Development Notes

The application includes a mock Stripe implementation for development purposes. In the development environment, you can use any card details as the payment processing is simulated.

When testing the payment method functionality:

1. Navigate to the Settings page
2. Go to the Payments tab
3. Add a mock payment method (any card details will work)
4. You can set the mock payment method as default or remove it

For business accounts, KYC verification must be completed before payment methods can be added.
