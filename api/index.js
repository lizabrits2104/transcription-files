const express = require('express');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.Z1_ACCESS_KEY_ID,
    secretAccessKey: process.env.Z1_SECRET_ACCESS_KEY,
    endpoint: 'https://s3.z1storage.com',
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
});

const app = express();

// CORS middleware - CRITICAL for cross-origin requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // In production, replace * with your domain
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware to parse URL-encoded bodies and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handle the quote form submission
app.post('/api/submit-quote', async (req, res) => {
    try {
        console.log('Received quote submission:', req.body); // Debug logging
        
        const { company, name, email, contact_no, service_type, turnaround_time, length, multiple_speakers, poor_audio, verbatim, time_stamping, fileUrl } = req.body;

        // Validation
        if (!name || !email || !contact_no || !service_type || !turnaround_time || !length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        if (!fileUrl) {
            return res.status(400).json({ 
                success: false, 
                message: 'File upload failed. Please try again.' 
            });
        }

        const transporter = nodemailer.createTransporter({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: '"HTTranstext" <info@httranstxt.co.za>', // Fixed syntax
            to: 'info@httranstxt.co.za',
            subject: `New Transcription Quote Request from ${name}`,
            html: `
                <p><strong>Client Details:</strong></p>
                <ul>
                    <li><strong>Company:</strong> ${company || 'N/A'}</li>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Contact Number:</strong> ${contact_no}</li>
                </ul>
                <p><strong>Transcription Details:</strong></p>
                <ul>
                    <li><strong>Service Type:</strong> ${service_type}</li>
                    <li><strong>Turnaround Time:</strong> ${turnaround_time}</li>
                    <li><strong>Length:</strong> ${length} minutes</li>
                </ul>
                <p><strong>Add-On Charges:</strong></p>
                <ul>
                    <li><strong>Multiple Speakers:</strong> ${multiple_speakers ? 'Yes' : 'No'}</li>
                    <li><strong>Poor Audio:</strong> ${poor_audio ? 'Yes' : 'No'}</li>
                    <li><strong>Verbatim:</strong> ${verbatim ? 'Yes' : 'No'}</li>
                    <li><strong>Time-stamping:</strong> ${time_stamping ? 'Yes' : 'No'}</li>
                </ul>
                <p><strong>Link to File:</strong> <a href="${fileUrl}">${fileUrl}</a></p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        
        res.status(200).json({ 
            success: true, 
            message: 'Quote request submitted successfully!' 
        });

    } catch (error) {
        console.error('Error handling quote submission:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again later.',
            error: error.message 
        });
    }
});

// New route for the contact form
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    try {
        const transporter = nodemailer.createTransporter({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: `"${name}" <${email}>`,
            to: 'info@httranstxt.co.za',
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <p>You have received a new message from your website's contact form.</p>
                <h3>Contact Details</h3>
                <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Subject:</strong> ${subject}</li>
                </ul>
                <h3>Message</h3>
                <p>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Contact form email sent.');
        res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending contact form email:', error);
        res.status(500).json({ success: false, message: 'Failed to send your message.' });
    }
});

// Route to Generate a Pre-signed Upload URL
app.post('/api/generate-upload-url', async (req, res) => {
    try {
        console.log('Generating upload URL for:', req.body); // Debug logging
        
        const { fileName, fileType } = req.body;
        
        if (!fileName) {
            return res.status(400).json({ error: 'fileName is required' });
        }

        // Generate unique filename to prevent conflicts
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;
        
        const s3Params = {
            Bucket: 'transcription-files1', // Fixed bucket name (no spaces)
            Key: uniqueFileName,
            Expires: 300, // Increased to 5 minutes for large files
            ContentType: fileType || 'application/octet-stream',
        };

        const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
        console.log('Generated upload URL successfully');
        
        res.status(200).json({ uploadUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ 
            error: 'Failed to generate upload URL.',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the Express app as a Vercel serverless function
module.exports = app;