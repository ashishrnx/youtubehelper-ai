import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get the search parameters from the request URL
    const searchParams = new URL(request.url).searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Construct the full URL
    const baseUrl = 'http://ec2-3-86-38-141.compute-1.amazonaws.com:8000';
    const fullUrl = `${baseUrl}${url}`;
    
    console.log('Requesting:', fullUrl); // Debug log

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}