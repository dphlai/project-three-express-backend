const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtAuthenticate = require('express-jwt');
const Doctor = require('./models/Doctor');
const Pharmacist = require('./models/Pharmacist');
const Prescription = require('./models/Prescription');
const dotenv = require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function(){
  console.log('Connected!');
}); // db.once()

const checkAuth = () => {
  return jwtAuthenticate({
      secret: SERVER_SECRET_KEY,
      algorithms: ['HS256']
  });
}; // checkAuth

const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY

//  -------------------- EXPRESS SERVER INITIALISATION --------------------  //

const express = require('express');
const app = express();
const PORT = process.env.PORT || 2854;
const cors = require('cors');

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT} ...`);
})

// -------------------------------- ROUTES --------------------------------  //

// LOGIN
app.post('/login/doctors', async (req, res) => {

  try {
    const {email, password} = req.body;
    const doctor = await Doctor.findOne({email});

    if(!doctor) {
      return res.status(401).json({error: 'Login failed! Check authentication credentials.'});
    } // if

    if(doctor && bcrypt.compareSync(password, doctor.passwordDigest)){

      const token = await jwt.sign(
        {
          _id: doctor._id,
          email: doctor.email,
          name: doctor.name,
          type: 'doctor'
        },
        SERVER_SECRET_KEY,
        {expiresIn: '72h'}
      ); // jwt.sign()

      res.json({
        user: {
          name: doctor.name,
          type: 'doctor'
        },
        token,
        success: true
      });

    } else {
      return res.json({error: 'Incorrect password.'})
    } // if else

  } catch(err) {
    res.status(500).json({error: err});
  }

}); // POST /login/doctors

// curl -XPOST -d '{"email":"goose@ga.co", "password":"chicken"}' http://localhost:2854/login/doctors -H 'content-type: application/json'

app.post('/login/pharmacists', async (req, res) => {

  try {
    const {email, password} = req.body;
    const pharmacist = await Pharmacist.findOne({email});

    if(!pharmacist) {
      return res.status(401).json({error: 'Login failed! Check authentication credentials.'});
    } // if

    if(pharmacist && bcrypt.compareSync(password, pharmacist.passwordDigest)){

      const token = await jwt.sign(
        {
          _id: pharmacist._id,
          email: pharmacist.email,
          name: pharmacist.name,
          type: 'pharmacist'
        },
        SERVER_SECRET_KEY,
        {expiresIn: '72h'}
      ); // jwt.sign()

      res.json({
        user: {
          name: pharmacist.name,
          type: 'pharmacist'
        },
        token,
        success: true
      });

    } else {
      return res.json({error: 'Incorrect password.'})
    } // if else


  } catch(err) {
    res.status(500).json({error: err});
  }

}); // POST /login/pharmacists

// curl -XPOST -d '{"email":"jen@ga.co", "password":"chicken"}' http://localhost:2854/login/pharmacists -H 'content-type: application/json'

// CREATE
app.post('/doctors', checkAuth(), async (req, res) => {

  const doctor = new Doctor(req.body);

  try {
    await doctor.save();
    res.json(doctor);
  } catch(err) {
    console.log('Query error:', err);
    res.status(500).json({error: err});
  }

}); // POST /doctors

app.post('/pharmacists', checkAuth(), async (req, res) => {

  const pharmacist = new Pharmacist(req.body);

  try {
    await pharmacist.save();
    res.json(pharmacist);
  } catch(err) {
    console.log('Query error:', err);
    res.status(500).json({error: err})
  }

}); // POST /pharmacists

app.post('/prescriptions', checkAuth(), async (req, res) => {

  if(req.user.type !== 'doctor'){
    console.log('Incorrect user type.');
    return res.status(401).json({error: 'Incorrect user type.'});
  }

  try {
    const prescription = new Prescription(req.body);
    const doctor = await Doctor.findById(req.user._id)
    console.log({doctor}, req.user);
    prescription.issuedByDoctor = req.user._id
    await prescription.save();
    await doctor.issuedPrescriptions.push(prescription._id)
    await doctor.save();
    res.json(prescription);
  } catch(err) {
    console.log('Query error:', err);
    res.status(500).json({error: err})
  }

}) // POST /prescriptions

// READ
app.get('/', checkAuth(), async (req, res) => {

  try {
    res.json({root: 'SEI37 Project Three!'})
  } catch (err) {
    console.log('Query error:', err);
    res.sendStatus(500).json({error: err});
  }

}); // GET /

app.get('/doctors', checkAuth(), async (req, res) => {

  try {
    const doctors = await Doctor.find({})
    .populate('issuedPrescriptions');
    res.json(doctors);
    // res.json(await Doctor.find())
  } catch(err) {
    console.log('Query error:', err);
    res.sendStatus(500).json({error: err});
  }

}); // GET /doctors

app.get('/doctors/:id', checkAuth(), async (req, res) => {

  try {
    const doctor = await Doctor.findOne({_id: req.params.id});
    res.json(doctor);
  } catch(err) {
    console.log('Query error:', err);
    res.sendStatus(500).json({error: err});
  }

}); // GET /doctors/:id

app.get('/pharmacists', checkAuth(), async (req, res) => {

  try {
    const pharmacists = await Pharmacist.find({});
    res.json(pharmacists);
    // res.json(await Pharmacist.find())
  } catch(err) {
    console.log('Query error:', err);
    res.sendStatus(500).json({error: err});
  }

}); // GET /pharmacists

app.get('/pharmacists/:id', checkAuth(), async (req, res) => {

  try {
    const pharmacist = await Pharmacist.findOne({_id: req.params.id});
    res.json(pharmacist);
  } catch(err) {
    console.log('Query error:', err);
    res.sendStatus(500).json({error: err});
  }

}); // GET /pharmacists/:id

app.get('/prescriptions', checkAuth(), async (req, res) => {

  try {
    const prescriptions = await Prescription.find({})
    .populate('issuedByDoctor')
    .populate('filledByPharmacist');
    res.json(prescriptions);
  } catch(err) {
    console.log('Query error:', err);
    res.sentStatus(500).json({error: err});
  }

}); // GET /prescriptions

app.get('/prescription-history', checkAuth(), async (req, res) => {

  try {
    const doctor = await Doctor.findById(req.user._id)
    .populate('issuedPrescriptions');
    const prescriptions = doctor.issuedPrescriptions
    res.json(prescriptions);
  } catch(err) {
    console.log('Query error:', err);
    res.sentStatus(500).json({error: err});
  }

}); // GET /prescription-history

app.get('/prescriptions/:id', checkAuth(), async (req, res) => {

  try {
    const prescription = await Prescription.findOne({_id: req.params.id})
    .populate('issuedByDoctor')
    .populate('filledByPharmacist');
    res.json(prescription);
  } catch(err) {
    console.log('Query error:', err);
    res.sendStatus(500).json({error: err});
  }

}); // GET /prescriptions/:id

// UPDATE
app.patch('/doctors/:id', checkAuth(), async (req, res) => {

  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body);
    await doctor.save();
    res.json(doctor);
  } catch(err) {
    console.log('Query error:', err);
    res.status(500).json({error: err});
  }

}); // PATCH /doctors/:id

app.patch('/pharmacists/:id', checkAuth(), async (req, res) => {

  try {
    const pharmacist = await Pharmacist.findByIdAndUpdate(req.params.id, req.body);
    await pharmacist.save();
    res.json(pharmacist);
  } catch(err) {
    console.log('Query error:', err);
    res.status(500).json({error: err});
  }

}); // PATCH /pharmacists/:id

app.patch('/prescriptions/:id/fill', checkAuth(), async (req, res) => {

  if(req.user.type !== 'pharmacist'){
    console.log('Incorrect user type.', req);
    return res.status(401).json({error: 'Incorrect user type.'});
  }

  try {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, {
      $set: {filledByPharmacist: req.user._id}
    }, {new: true})
    .populate('issuedByDoctor')
    .populate('filledByPharmacist');
    res.json(prescription);
  } catch(err) {
    console.log('Query error:', err);
    res.status(500).json({error: err});
  }

}); // PATCH /prescriptions/:id

// DELETE
app.delete('/doctors/:id', checkAuth(), async (req, res) => {

  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if(!doctor) res.status(404).json({notFound: true});
    res.status(200).json({success: true});
  } catch(err) {
    res.status(500).json({error: err});
  }

}) // DELETE /doctors/:id

app.delete('/pharmacists/:id', checkAuth(), async (req, res) => {

  try {
    const pharmacist = await Pharmacist.findByIdAndDelete(req.params.id);
    if(!pharmacist) res.status(404).json({notFound: true});
    res.status(200).json({sucess: true});
  } catch(err) {
    res.status(500).json({error: err});
  }

}) // DELETE /pharmacists/:id

app.delete('/prescriptions/:id', checkAuth(), async (req, res) => {

  try {
    const prescription = await Prescription.findByIdAndDelete(req.params.id);
    if(!prescription) res.staus(404).json({notFound: true});
    res.status(200).json({success: true});
  } catch(err) {
    res.status(500).json({error: err})
  }

}); // DELETE /pharmacists/:id
