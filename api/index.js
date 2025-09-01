const express = require('express');
const path = require('path');
const multer = require('multer');
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
const port = 3000;

// --- Corrected Middleware & Setup ---

// Middleware to parse URL-encoded bodies (for the contact form)
app.use(express.urlencoded({ extended: true }));
// Middleware to parse JSON bodies (in case you use it)
app.use(express.json());

// Set up Multer for file uploads using memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Route to serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'your-quote-page.html'));
});

// Handle the quote form submission
app.post('/submit-quote', upload.single('file_upload'), async (req, res) => {
  try {
    const {
      company,
      name,
      email,
      contact_no,
      service_type,
      turnaround_time,
      length,
    } = req.body;
    const uploadedFile = req.file;

    const multiple_speakers = req.body.multiple_speakers === 'on';
    const poor_audio = req.body.poor_audio === 'on';
    const verbatim = req.body.verbatim === 'on';
    const time_stamping = req.body.time_stamping === 'on';

    console.log('New Quote Request Received:');
    console.log(`- Company: ${company || 'N/A'}`);
    console.log(`- Name: ${name}`);
    console.log(`- Email: ${email}`);
    console.log(`- Contact Number: ${contact_no}`);
    console.log(`- Service: ${service_type}`);
    console.log(`- Turnaround Time: ${turnaround_time}`);
    console.log(`- Length: ${length} minutes`);
    console.log(`- Add-Ons:`, { multiple_speakers, poor_audio, verbatim, time_stamping });
    console.log(`- File: ${uploadedFile ? uploadedFile.originalname : 'No file uploaded'}`);

    let fileUrl = 'No file uploaded';
    if (uploadedFile) {
      const params = {
        Bucket: 'transcription files1',
        Key: uploadedFile.originalname,
        Body: uploadedFile.buffer,
        ContentType: uploadedFile.mimetype,
      };
      
      const data = await s3.upload(params).promise();
      fileUrl = data.Location;
    }

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
        <p><strong>File Upload:</strong></p>
        <p>Name: ${uploadedFile ? uploadedFile.originalname : 'No file uploaded'}</p>
        <p><strong>Link to File:</strong> ${fileUrl}</p>
      `,
      attachments: []
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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});