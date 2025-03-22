const fetch = require('node-fetch');

const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("[Middleware] Authorization header:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Verify token with GitHub
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log("[Middleware] Invalid token response:", await response.json());
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userData = await response.json();
    req.user = {
      username: userData.login,
      id: userData.id,
      name: userData.name,
      email: userData.email
    };

    console.log("[Middleware] User authenticated:", req.user);
    next();
  } catch (error) {
    console.error('Error verifying GitHub token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
};

module.exports = {
  isAuthenticated
}; 