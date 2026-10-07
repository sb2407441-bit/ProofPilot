// Curated snapshots, not a live search feed. Only organizer-authored sources.
export const evidenceDate = '2026-10-07';
export const opportunities = [
  {
    id:'glc', name:'Global Leadership Challenge', organizer:'Oxford × St. Gallen',
    category:'Leadership', location:'Online', format:'Online', tagline:'Five days of collaboration. A chance to go further.',
    deadline:{date:'2026-11-05',precision:'date'},
    checkedAt:evidenceDate, source:'https://www.leadership-challenge.org/applynow',
    application:'https://form.jotform.com/262503401593047',
    rules:{age:[21,30],degree:true,leadership:true,availability:'10–14 December 2026'},
    funding:{type:'conditional',travel:'Top 3 teams only',headline:'A travel award is conditional.',
      detail:'Travel and accommodation are covered for the top three teams. Participation begins online.'},
    requirements:['Reviewed CV (PDF)','Recent portrait','English video of at most 40 seconds','A real leadership action','Availability for five half-days'],
    facts:[{id:'program.online',label:'Online collaboration',text:'The programme begins with online collaboration from 10–14 December 2026.'}],
  },
  {
    id:'isoc',name:'Internet Society Fellowship',organizer:'Internet Society',category:'Safety & security',location:'Hybrid',format:'Hybrid',
    tagline:'Build a practical project for a stronger Internet.',
    deadline:{date:'2026-11-22',precision:'date',label:'Training completion'}, applicationDeadline:'2026-12-18',
    checkedAt:evidenceDate,source:'https://www.internetsociety.org/fellowship/',application:'https://www.internetsociety.org/fellowship/',
    rules:{training:true,weeklyHours:4},
    funding:{type:'project',travel:'Selected fellows',headline:'Project support follows selection.',
      detail:'Selected fellows can access event travel support and up to USD 5,000 for approved direct project costs. This is not a personal salary.'},
    requirements:['Complete prerequisite training','Develop your own project proposal','Four hours per week, plus project implementation','English proficiency and reliable Internet','Valid passport for travel'],
    facts:[{id:'program.community',label:'Community project',text:'The fellowship supports practical projects that strengthen the Internet in communities.'}],
  },
  {
    id:'pycon',name:'PyCon Namibia Grants',organizer:'PyCon Namibia',category:'Developer conference',location:'Namibia',format:'In person',
    tagline:'Connect with the Python community in Namibia.',
    deadline:{date:'2026-10-21',precision:'date'},checkedAt:evidenceDate,
    source:'https://na.pycon.org/2027/grants/',application:'https://na.pycon.org/2027/grants/',rules:{},
    funding:{type:'reimbursement',travel:'Paid after attendance',headline:'Plan for upfront costs.',
      detail:'Assistance may contribute to registration, accommodation and travel. Recipients must cover upfront costs; reimbursement follows attendance.'},
    requirements:['A feasible upfront funding plan','Review the grant terms and eligible expenses'],
    facts:[{id:'program.community',label:'Python community',text:'The conference welcomes people interested in Python and technology.'}],
  },
];

export const demoProfile = {birthYear:2000,country:'Pakistan',degreeCompleted:true,currentStudent:false,role:'AI developer',degree:'Entrepreneurship',experienceMonths:12,canFrontTravel:false,trainingComplete:false,weeklyHours:4,leadershipAction:'',availabilityConfirmed:false};
