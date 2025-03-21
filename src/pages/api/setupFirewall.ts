import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This simple endpoint returns the status of the API server
  res.status(200).json({ 
    status: 'ok',
    message: 'API server is running correctly',
    timestamp: new Date().toISOString()
  });
} 