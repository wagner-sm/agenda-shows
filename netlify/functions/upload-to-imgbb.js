const fetch = require('node-fetch');
const FormData = require('form-data');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

exports.handler = async function(event) {
  const { url } = event.queryStringParameters || {};

  if (!url) {
    return {
      statusCode: 400,
      body: 'Missing url parameter',
    };
  }

  try {
    // Baixa a imagem da URL com User-Agent e timeout
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageUploader/1.0)'
      },
      timeout: 15000
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Error fetching image: ${response.statusText}`,
      };
    }

    const buffer = await response.buffer();

    // Converte para base64
    const base64Image = buffer.toString('base64');

    // Prepara o form para upload
    const form = new FormData();
    form.append('key', IMGBB_API_KEY);
    form.append('image', base64Image);

    // Envia para ImgBB
    const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: 15000
    });

    const uploadData = await uploadResponse.json();

    if (uploadData.success) {
      return {
        statusCode: 200,
        body: JSON.stringify({ url: uploadData.data.url }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to upload image to ImgBB' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }
  } catch (error) {
    console.error('Error in upload-to-imgbb:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};