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

// Middleware to parse URL-encoded bodies and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handle the quote form submission
app.post('/submit-quote', async (req, res) => {
    try {
        const { company, name, email, contact_no, service_type, turnaround_time, length, multiple_speakers, poor_audio, verbatim, time_stamping, fileUrl } = req.body;

        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: '"HTTranstext" info@httranstxt.co.za',
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
                <p><strong>Link to File:</strong> ${fileUrl}</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).send('Quote request submitted successfully!');

    } catch (error) {
        console.error('Error handling quote submission:', error);
        res.status(500).send('An error occurred. Please try again later.');
    }
});

// New route for the contact form
app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    try {
        const transporter = nodemailer.createTransport({
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
app.post('/generate-upload-url', async (req, res) => {
    try {
        const { fileName, fileType } = req.body;
        const s3Params = {
            Bucket: 'transcription files1',
            Key: fileName,
            Expires: 60, // The URL will be valid for 60 seconds
            ContentType: fileType,
        };

        const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
        res.status(200).json({ uploadUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL.' });
    }
});

// Export the Express app as a Vercel serverless function
module.exports = app;