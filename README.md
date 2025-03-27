# Collab Backend

A real-time collaborative backend service that enables multiple users to work together on GitHub repositories, featuring live collaboration, room management, and GitHub integration.

## Features

- 🔐 GitHub OAuth Authentication
- 👥 Real-time Collaboration Rooms
- 📝 File Management and Versioning
- 🔄 GitHub Repository Integration
- 🚀 Direct Commit and PR Creation
- ⏱️ Room Activity Tracking
- 👤 User Management System
- 🔄 Real-time Code Synchronization
- 🔒 Secure Authentication Flow
- 📊 Activity Monitoring

## Tech Stack

- **Runtime**: Node.js (>= 14)
- **Database**: MongoDB with Mongoose
- **Authentication**: GitHub OAuth
- **Real-time Communication**: Socket.IO
- **API Integration**: Octokit (GitHub API)
- **HTTP Client**: Axios
- **Session Management**: Express Session with Connect-MongoDB
- **CORS Support**: Express CORS middleware

## Prerequisites

- Node.js >= 14
- MongoDB (4.4 or higher)
- GitHub OAuth App Credentials
- npm or yarn
- A GitHub account with repository access

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/collab-backend.git
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the root directory:
```bash
MONGODB_URI=your_mongodb_connection_string
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_jwt_secret
PORT=3000
```

## API Endpoints
### Authentication
- POST /auth/user - Register/Login user with GitHub credentials
### Rooms
- POST /rooms - Create a new collaboration room
- GET /rooms/:id - Get room details
- POST /rooms/:id/commit - Commit changes to GitHub
- POST /rooms/:id/pr - Create a pull request
## Models
### User Model
- GitHub authentication details
- Profile information
- Room associations
- Activity tracking
### Room Model
- Room configuration
- User management
- File versioning
- Repository integration
## Contributing
1. Fork the repository
2. Create your feature branch ( git checkout -b feature/amazing-feature )
3. Commit your changes ( git commit -m 'Add some amazing feature' )
4. Push to the branch ( git push origin feature/amazing-feature )
5. Open a Pull Request
## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments
- GitHub API
- MongoDB Team
- Socket.IO Team
- All contributors and users of this project