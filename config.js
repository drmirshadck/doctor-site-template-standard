/* =====================================================================
   DOCTOR SETTINGS — the ONLY file to edit for a new doctor.
   1. Fill in every field below (keep the quotes and commas).
   2. Replace doctor.jpg with the doctor's portrait (same file name).
   3. Push to the doctor's NEW GitHub repo and turn on GitHub Pages.
   Leave a field as "" to hide that part of the site.
   ===================================================================== */
window.SITE = {

  /* ---------- Doctor ---------- */
  doctor: {
    name: "Dr. Sample Name",              // full name as shown in the hero
    shortName: "Dr. Sample",              // used in sentences ("Consult Dr. Sample privately")
    photo: "doctor.jpg",                  // portrait in the same folder
    eyebrow: "Physician · Since 2015",    // small line above the name
    role: "MBBS, MD · Consultant Physician, Sample Clinic",
    lead: "Over a decade of clinical practice, now open for private video consultations with patients across India and abroad.",
    badgeNumber: "11",                    // big number on the photo badge
    badgeText: "years of<br>clinical practice"
  },

  /* ---------- Top bar ---------- */
  brand: {
    title: "DR. SAMPLE NAME",
    subtitle: "Online Clinic"
  },

  /* ---------- Colours (any hex colour) ---------- */
  theme: {
    brand: "#0e8a8a",       // main colour (buttons, highlights)
    brandDeep: "#074a50",   // dark colour (hero, footer)
    accent: "#d94a3d",      // "Book appointment" button
    light: "#9fe3dc"        // light highlight text on dark areas
  },

  /* ---------- Stats band under the hero ---------- */
  stats: {
    headline: "Healing hands, <span>caring heart.</span>",
    items: [
      { value: "11",   label: "Years in practice" },
      { value: "2015", label: "Clinic founded", countFrom: 2000 },
      { value: "30",   suffix: " min", label: "Every new consultation" }
    ]
  },

  /* ---------- About ---------- */
  about: {
    heading: "A physician who takes the time to understand the whole person, not just the complaint.",
    paragraphs: [
      "Dr. Sample Name trained at Sample Medical College and founded Sample Clinic in 2015.",
      "Consultations are unhurried and detailed. The online clinic brings that same approach to patients who cannot travel."
    ]
  },

  /* ---------- Experience ---------- */
  experience: {
    // icon: "degree" | "clinic" | "language" | "registration" | "award"
    credentials: [
      { icon: "degree",       title: "MBBS, MD",            text: "Sample Medical College" },
      { icon: "clinic",       title: "Founder & Consultant", text: "Sample Clinic, City" },
      { icon: "language",     title: "Languages",           text: "Malayalam, English" },
      { icon: "registration", title: "Registration",        text: "Reg. No. 00000" }
    ],
    timeline: [
      { year: "2010–2015", title: "Medical degree",        text: "Sample Medical College." },
      { year: "2015",      title: "Founded Sample Clinic", text: "Opened as a family clinic." },
      { year: "2026",      title: "Online clinic",         text: "Opened online video consultations." }
    ]
  },

  /* ---------- Consultations & fees (fees show only inside the booking window) ---------- */
  consultations: {
    intro: "Choose your consultation, pay securely by UPI, then pick your time.",
    types: [
      // calSlug = the event's link name in the doctor's Cal.com (cal.com/<username>/<calSlug>)
      // fee: 0 = no online payment (goes straight to the calendar)
      { calSlug: "online-video-consultation", name: "New consultation", duration: "30 minutes", fee: 500, featured: true,
        text: "A detailed first consultation with a complete case history, followed by your prescription." },
      { calSlug: "review-consultation", name: "Review consultation", duration: "20 minutes", fee: 300,
        text: "For patients already under the doctor's care. Progress review and an updated prescription." },
      { calSlug: "clinic-visit", name: "Clinic visit", duration: "At the clinic", fee: 0, inClinic: true,
        text: "Book a time to see the doctor in person at the clinic. Pay at the clinic." }
    ]
  },

  /* ---------- Cal.com (doctor's OWN account, opened with the doctor's Microsoft email) ---------- */
  cal: {
    username: "",                 // e.g. "murshida-kk-qngtnk"  (from cal.com/<username>)
    doctorEmail: ""               // the doctor's Microsoft email used for Cal.com, e.g. "doctorname@outlook.com"
  },

  /* ---------- Payment (UPI) ---------- */
  payment: {
    upiId: "sample@upi",            // the doctor's real UPI ID
    payeeName: "Dr Sample Name"     // name shown in the UPI app
  },

  /* ---------- Video consultation (doctor's OWN Daily account) ---------- */
  video: {
    roomUrl: ""   // e.g. "https://drsample.daily.co/consult"  (private room, waiting room ON)
    // Patients join at:  yoursite.com/consult.html
    // Doctor joins at:   yoursite.com/consult.html?host=<owner token>   (keep this link private)
  },

  /* ---------- Several doctors (optional) ----------
     Leave this EMPTY for one doctor: the doctor, cal, payment and video settings above are used.
     For 2+ doctors on one website, list EVERY doctor here (the first is usually the hero doctor above).
     Each doctor has their OWN Cal.com and Daily (opened with their own Microsoft email).
     Patients pick a doctor, then book that doctor's Cal.com. Video room: consult.html?d=<id>
     (put that link as the "location" in each doctor's Cal.com events).
     consultations / upiId / payeeName are optional: left out = the shared ones above. */
  doctors: [
    // { id: "sample", name: "Dr. Sample Name", photo: "doctor.jpg", title: "MBBS, MD · Consultant Physician",
    //   languages: "English, Malayalam", bio: "Short line about the doctor.",
    //   calUser: "sample-name-abc123", doctorEmail: "drsample@outlook.com",
    //   roomUrl: "https://drsample.daily.co/consult", upiId: "sample@upi", payeeName: "Dr Sample Name" },
    // { id: "second", name: "Dr. Second Doctor", photo: "doctor2.jpg", title: "BHMS · Homoeopathic Physician", ... }
  ],

  /* ---------- Doctor dashboard helper (Standard package) ---------- */
  helper: {
    url: "https://dr-sample-helper.drmirshadck.workers.dev"   // the doctor's Cloudflare helper, e.g. "https://dr-sample-helper.dotcom.workers.dev"
  },

  /* ---------- "Consult from anywhere" panel ---------- */
  panel: {
    eyebrow: "Consult from anywhere",
    heading: "The same careful consultation, wherever you are.",
    text: "Patients from Kerala, across India and the Gulf can consult without travelling.",
    ticks: ["Private video room", "Full 30 minutes", "Prescription after the call"]
  },

  /* ---------- Instagram (set handle to "" to hide the section) ---------- */
  instagram: {
    handle: "sample_clinic",
    displayName: "Sample Clinic",
    posts: "150+", followers: "1K+", since: "2015",
    bio: "<b>Trusted care since 2015</b><br>City, District",
    text: "Health tips, clinic updates and awareness videos. Follow along to stay up to date."
  },

  /* ---------- FAQ ---------- */
  faq: [
    { q: "Do I need to install an app?", a: "No. The consultation opens in your browser on this website. Chrome or Safari on a phone or laptop works best." },
    { q: "How do I receive the consultation link?", a: "After you pay and pick your time, a confirmation email with your consultation link is sent to you. The clinic also sends the link to your WhatsApp." },
    { q: "Can I consult from outside India?", a: "Yes. Book the same way. If you can't pay by UPI, message the clinic on WhatsApp for other payment options." },
    { q: "Can I reschedule?", a: "Yes. Use the reschedule link in your confirmation email, or message the clinic on WhatsApp." }
  ],

  /* ---------- Contact ---------- */
  contact: {
    phoneDisplay: "+91 90000 00000",
    whatsapp: "919000000000",        // digits only, with country code — booking requests are sent here
    hours: "WhatsApp or call, Monday to Saturday.",
    clinicName: "Sample Clinic",
    address: ["Street", "City", "District, Kerala"]
  },

  /* ---------- Page details ---------- */
  meta: {
    title: "Dr. Sample Name",
    description: "Dr. Sample Name. Book an online video consultation.",
    year: "2026"
  }
};
