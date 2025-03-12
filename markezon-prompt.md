# Build a Social Marketplace Platform: Markezon

I need your help building a modern social marketplace platform called Markezon that combines social media features with a service marketplace. This application is designed to be a one-stop platform where professionals can showcase their services while also building a social presence through posts, interactions, and networking.

Markezon aims to bridge the gap between traditional social media and service marketplaces, creating a community where users can:

1. Create accounts and authenticate securely
2. Share posts with images and text to showcase their work and ideas
3. Engage with content through likes and comments
4. Discover other users' content through an intuitive discovery page
5. List professional services they offer with detailed information
6. Browse, search, and filter services by category
7. View detailed user profiles with statistics and service offerings

The platform should have a sleek, modern dark theme UI with responsive design for both mobile and desktop users. The focus should be on creating a seamless user experience that encourages both social interaction and professional networking.

## Technical Requirements

Please build this application using the following tech stack:

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with a dark theme
- **UI Components**: Shadcn UI (or similar component library)
- **Backend**: Supabase for authentication, database, and storage
- **Routing**: React Router for navigation
- **State Management**: React Query (optional)

## Core Features

### Authentication System

- Email/password authentication with validation
- Google OAuth integration with branded button
- Protected routes for authenticated users
- Redirect to login for unauthenticated users
- Elegant login/signup form with toggle between modes
- "Continue with email" option as alternative to social login
- Session persistence with automatic redirect to home when logged in
- Error handling with toast notifications

### Social Feed

- Home feed showing posts from all users
- Ability to create posts with text and multiple images
- Like and comment functionality with real-time counters
- Post detail view with expanded comments and likes list
- User can delete or edit their own posts
- Time-ago format for post timestamps (e.g., "2h", "3d")
- Interactive post cards with user avatars and usernames
- Support for text-only posts
- Image gallery with navigation for multi-image posts

### Service Marketplace

- Users can create service listings with:
  - Title, description, category
  - Featured image
  - Price information (flexible format, e.g., "$100/hour" or "Starting from $500")
  - Business name (optional)
  - List of features/benefits (dynamic list with add/remove functionality)
- Service discovery page with search and filtering by category
- Service detail modal with scrollable content sections
- Category badges for quick identification
- Grid layout for service browsing
- Trending services section on home page
- Modal form for adding new services with validation

### User Profiles

- Public profiles showing user information
- Display of user's posts and services in a grid layout
- Profile statistics (followers, following, posts count, reviews)
- Ability to follow other users
- Avatar display with fallback for users without profile pictures
- Bio/about section for personal or business description
- Separate tabs for posts and services
- Edit profile functionality for the current user
- Reviews and ratings system for service providers

### UI/UX Requirements

- Responsive design that works on mobile and desktop
- Dark theme with modern aesthetics and glass-like elements
- Smooth transitions and loading states
- Intuitive navigation with sidebar and mobile-friendly header
- Card-based UI for posts and services
- Modal dialogs for detailed views
- Double-tap to like posts (mobile-friendly interaction)
- Image carousel for posts with multiple images

## Database Structure

The application should use Supabase with the following tables:

1. **profiles** - User profile information
   - id (references auth.users)
   - username
   - avatar_url
   - bio
   - followers_count
   - following_count
   - posts_count
   - reviews_count
   - reviews_rating

2. **posts** - Social media posts
   - id
   - user_id (references profiles)
   - caption
   - image_url (JSON array of image URLs)
   - created_at
   - updated_at

3. **comments** - Comments on posts
   - id
   - post_id (references posts)
   - user_id (references profiles)
   - content
   - created_at

4. **likes** - Post likes
   - id
   - post_id (references posts)
   - user_id (references profiles)
   - created_at

5. **services** - Service listings
   - id
   - user_id (references profiles)
   - title
   - description
   - category
   - image (URL)
   - business (optional)
   - price (optional)
   - features (JSON array)
   - created_at
   - updated_at

## Page Structure

1. **Auth Page** - Login/signup page
2. **Home** - Main feed with posts and sidebar
3. **Discover** - Grid view of posts for discovery
4. **Profile** - Current user's profile
5. **User Profile** - Other users' profiles
6. **Messages** - Messaging interface (can be a placeholder)
7. **Notifications** - Notifications page (can be a placeholder)

## Component Structure

### Core Components
- Header with navigation and user menu
- Mobile-friendly header with search functionality
- Sidebar with navigation icons and active state
- Post component with like/comment functionality
- CreatePost component for creating new posts
- ServiceCard for displaying service listings
- Modals for post details, comments, likes, and service details
- SearchDropdown for search functionality
- TrendingServices component for home page

### UI Components
- Buttons, inputs, cards, etc. from Shadcn UI
- Avatar component with fallback
- Badge component for categories
- Dialog/Modal components for overlays
- Toast notifications for feedback
- Form components with validation
- Dropdown menus for actions
- Custom icons from Lucide React

## Implementation Details

1. **Setup Supabase**
   - Create tables with appropriate relationships and foreign keys
   - Set up authentication with email and OAuth providers
   - Configure storage buckets for avatars and post images
   - Create database triggers for updating counts (followers, posts, etc.)
   - Set up row-level security policies for data protection

2. **Create React Application**
   - Set up Vite with React and TypeScript
   - Configure Tailwind CSS with custom theme colors
   - Install and configure Shadcn UI components
   - Set up React Router with protected routes
   - Create custom hooks for responsive design and authentication

3. **Implement Authentication**
   - Create elegant login/signup forms with validation
   - Implement Google OAuth integration
   - Set up protected routes with authentication checks
   - Create user onboarding flow for new users
   - Implement session persistence and management

4. **Build Core Features**
   - Create post component with like/comment functionality
   - Implement image upload with preview for posts
   - Build service creation and display components
   - Create user profile pages with statistics
   - Implement social features (likes, comments, follows)
   - Build search functionality for posts and services

5. **Styling and Polish**
   - Apply consistent dark theme styling
   - Ensure responsive design for mobile and desktop
   - Add loading skeletons for async operations
   - Implement error handling with toast notifications
   - Add animations and transitions for better UX
   - Optimize performance with proper React patterns

## Additional Requirements

- Implement proper error handling with user-friendly messages
- Add loading states and skeleton loaders for async operations
- Ensure the application is responsive across all device sizes
- Use TypeScript for type safety with proper interfaces and types
- Follow best practices for React development (hooks, context, etc.)
- Implement proper form validation for all user inputs
- Ensure accessibility standards are met

## Development Approach

When building this application, please follow these guidelines:

1. **Start with a solid foundation**:
   - Begin by setting up the project structure and core dependencies
   - Configure Supabase with the necessary tables and authentication
   - Create reusable UI components that will be used throughout the app

2. **Implement core features incrementally**:
   - Start with authentication to enable user management
   - Build the social feed functionality next
   - Then implement the service marketplace features
   - Finally, add user profiles and additional features

3. **Focus on functionality first, then polish**:
   - Get the core features working before adding animations and transitions
   - Ensure data flow and state management are working correctly
   - Add loading states and error handling once the basic functionality works
   - Polish the UI and add animations as the final step

4. **Provide explanations for key implementation decisions**:
   - Explain your approach to state management
   - Describe how you handle authentication and protected routes
   - Detail your strategy for handling image uploads and storage
   - Explain how you implement real-time or near-real-time features

The final product should be a functional social marketplace platform that combines social media features with service listings, providing a seamless experience for users to share content, interact with others, and offer their professional services.
