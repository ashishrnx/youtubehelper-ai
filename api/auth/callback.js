import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://socialpostapi.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: process.env.SOCIAL_POST_API_CLIENT_ID,
        client_secret: process.env.SOCIAL_POST_API_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const { access_token } = await tokenResponse.json();

    // Redirect to the frontend with the token
    res.redirect(`/?token=${access_token}`);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
}