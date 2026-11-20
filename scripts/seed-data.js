// Realistic, connected demo data for MentorLagbe (fictional people, fictional phone numbers).
// Image paths are static files served by the CLIENT (public/avatars, public/banners).

export const DEMO_PASSWORDS = { tutor: 'Tutor@123456', student: 'Student@123456', other: 'Demo@123456' };

const tutorPw = DEMO_PASSWORDS.tutor;
const other = DEMO_PASSWORDS.other;

export const tutors = [
  { key: 't01', name: 'Farhana Rahman', email: 'tutor@mentorlagbe.com', password: tutorPw, plan: 'free', phone: '+8801700000001', joined: 120,
    bio: 'Physics tutor with six years of classroom experience in Dhanmondi. I turn formulas into stories students can actually picture, and I track every learner with weekly tests.' },
  { key: 't02', name: 'Tanvir Ahmed', email: 'protutor@mentorlagbe.com', password: tutorPw, plan: 'pro', phone: '+8801700000002', joined: 150,
    bio: 'Mathematics graduate (BUET) teaching Higher Math and Class 6-8 maths. I focus on understanding first, speed second — and my students usually finish the syllabus a month early.' },
  { key: 't03', name: 'Nusrat Jahan', email: 'nusrat.jahan@example.com', password: other, plan: 'pro', phone: '+8801700000003', joined: 140,
    bio: 'IELTS band 8.0 holder and English language coach. I have helped over 150 students reach their target band and prepare for SSC English with confidence.' },
  { key: 't04', name: 'Mahmudul Hasan', email: 'mahmudul.hasan@example.com', password: other, plan: 'free', phone: '+8801700000004', joined: 95,
    bio: 'Chemistry teacher who loves reaction mechanisms. Former Dhaka University chemistry student, teaching HSC and admission candidates in Mirpur.' },
  { key: 't05', name: 'Sadia Islam', email: 'sadia.islam@example.com', password: other, plan: 'free', phone: '+8801700000005', joined: 88,
    bio: 'Medical student and biology tutor. I know the admission exam from the inside and teach with high-yield summaries and timed MCQ practice.' },
  { key: 't06', name: 'Rafiul Karim', email: 'rafiul.karim@example.com', password: other, plan: 'pro', phone: '+8801700000006', joined: 110,
    bio: 'Software engineer who mentors beginners in Python and web development. Learning by building real projects is my whole teaching philosophy.' },
  { key: 't07', name: 'Ishrat Chowdhury', email: 'ishrat.chowdhury@example.com', password: other, plan: 'free', phone: '+8801700000007', joined: 76,
    bio: 'Bangla literature graduate teaching SSC students in Chattogram. Patient with weak writers and strict about practice.' },
  { key: 't08', name: 'Arif Hossain', email: 'arif.hossain@example.com', password: other, plan: 'free', phone: '+8801700000008', joined: 70,
    bio: 'Chartered-accountancy student teaching HSC Accounting in Mohammadpur. Clear steps, plenty of problems, no shortcuts that backfire in the exam.' },
  { key: 't09', name: 'Tasnim Sultana', email: 'tasnim.sultana@example.com', password: other, plan: 'free', phone: '+8801700000009', joined: 64,
    bio: 'CSE graduate teaching HSC ICT online. I break programming and Boolean algebra into small steps that stay with you.' },
  { key: 't10', name: 'Imran Kabir', email: 'imran.kabir@example.com', password: other, plan: 'free', phone: '+8801700000010', joined: 52,
    bio: 'Economics lecturer assistant supporting first-year university students with graphs, theory and past papers.' },
  { key: 't11', name: 'Mehnaz Akter', email: 'mehnaz.akter@example.com', password: other, plan: 'free', phone: '+8801700000011', joined: 58,
    bio: 'Mathematics teacher from Sylhet with eight years of experience helping SSC students overcome maths anxiety.' },
  { key: 't12', name: 'Shafiq Alam', email: 'shafiq.alam@example.com', password: other, plan: 'free', phone: '+8801700000012', joined: 47,
    bio: 'RUET alumnus coaching engineering admission candidates in Rajshahi. Problem solving, shortcuts and weekly mock exams.' },
];

const studentPw = DEMO_PASSWORDS.student;

export const students = [
  { key: 's01', name: 'Nabila Rahman', email: 'student@mentorlagbe.com', password: studentPw, plan: 'free', phone: '+8801710000001', joined: 60, bio: 'Class 10 student in Dhaka preparing for SSC.' },
  { key: 's02', name: 'Tahmid Hasan', email: 'prostudent@mentorlagbe.com', password: studentPw, plan: 'pro', phone: '+8801710000002', joined: 66, bio: 'HSC examinee aiming for engineering admission.' },
  { key: 's03', name: 'Ishrat Jahan', email: 'ishrat.jahan@example.com', password: other, plan: 'free', phone: '+8801710000003', joined: 55, bio: '' },
  { key: 's04', name: 'Mehedi Hasan', email: 'mehedi.hasan@example.com', password: other, plan: 'free', phone: '+8801710000004', joined: 54, bio: 'Class 9 student from Mirpur.' },
  { key: 's05', name: 'Sumaiya Akter', email: 'sumaiya.akter@example.com', password: other, plan: 'free', phone: '+8801710000005', joined: 50, bio: '' },
  { key: 's06', name: 'Fahim Shahriar', email: 'fahim.shahriar@example.com', password: other, plan: 'free', phone: '+8801710000006', joined: 48, bio: 'University freshman learning to code.' },
  { key: 's07', name: 'Anika Tabassum', email: 'anika.tabassum@example.com', password: other, plan: 'free', phone: '+8801710000007', joined: 45, bio: '' },
  { key: 's08', name: 'Rakib Hossain', email: 'rakib.hossain@example.com', password: other, plan: 'free', phone: '+8801710000008', joined: 43, bio: 'Admission candidate from Rajshahi.' },
  { key: 's09', name: 'Jannatul Ferdous', email: 'jannatul.ferdous@example.com', password: other, plan: 'pro', phone: '+8801710000009', joined: 41, bio: 'Preparing for IELTS to study abroad.' },
  { key: 's10', name: 'Sakib Mahmud', email: 'sakib.mahmud@example.com', password: other, plan: 'free', phone: '+8801710000010', joined: 39, bio: '' },
  { key: 's11', name: 'Maisha Khan', email: 'maisha.khan@example.com', password: other, plan: 'free', phone: '+8801710000011', joined: 37, bio: 'SSC candidate in Sylhet.' },
  { key: 's12', name: 'Tanvir Islam', email: 'tanvir.islam@example.com', password: other, plan: 'pro', phone: '+8801710000012', joined: 34, bio: 'Curious about web development.' },
  { key: 's13', name: 'Nafisa Chowdhury', email: 'nafisa.chowdhury@example.com', password: other, plan: 'free', phone: '+8801710000013', joined: 31, bio: 'Medical admission aspirant.' },
  { key: 's14', name: 'Ayman Sadiq', email: 'ayman.sadiq@example.com', password: other, plan: 'free', phone: '+8801710000014', joined: 20, bio: '' },
  { key: 's15', name: 'Priyanka Das', email: 'priyanka.das@example.com', password: other, plan: 'pro', phone: '+8801710000015', joined: 13, bio: 'Class 7 student who needs a patient maths tutor.' },
  { key: 's16', name: 'Zahid Hasan', email: 'zahid.hasan@example.com', password: other, plan: 'free', phone: '+8801710000016', joined: 8, bio: '' },
];

// `no` is the 1-based tuition number used by `applications` and `bookmarks` below.
export const tuitions = [
  { no: 1, tutor: 't01', title: 'SSC Physics: concepts, numericals and board patterns', subject: 'Physics', classLevel: 'Class 9-10 (SSC)', mode: 'Offline', location: 'Dhanmondi 27, Dhaka', monthlyFee: 4500, daysPerWeek: 3, schedule: 'Sat, Mon, Wed · 5:00–6:30 PM', banner: 'physics-1', status: 'approved', active: true, daysAgo: 24,
    description: 'A small-group classroom batch for SSC examinees who want physics to finally make sense. Each class starts with one core concept, moves to solved numericals and ends with a short timed quiz based on past board questions. Batch size is capped at 8 so every student gets individual feedback. Includes weekly mock tests and a printed formula-and-units sheet.' },
  { no: 2, tutor: 't01', title: 'HSC Physics 1st & 2nd Paper — live online batch', subject: 'Physics', classLevel: 'Class 11-12 (HSC)', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 2800, daysPerWeek: 4, schedule: 'Sun, Tue, Thu, Fri · 8:00–9:30 PM', banner: 'physics-2', status: 'approved', active: true, daysAgo: 12,
    description: 'Live online classes covering both HSC Physics papers in sequence, with recordings shared the same evening. We solve at least 15 board-style problems per chapter and review mistakes in a dedicated doubt-clearing hour every Friday. Ideal for students outside Dhaka or those with long commutes. Students get a chapter-wise worksheet pack and WhatsApp support for quick questions.' },
  { no: 3, tutor: 't02', title: 'HSC Higher Math: Calculus and Vectors made simple', subject: 'Higher Mathematics', classLevel: 'Class 11-12 (HSC)', mode: 'Online', location: 'Online (Zoom)', monthlyFee: 3200, daysPerWeek: 3, schedule: 'Sat, Mon, Wed · 9:00–10:30 PM', banner: 'higher-math-1', status: 'approved', active: true, daysAgo: 3,
    description: 'Calculus and vectors are taught from the geometry up, so the formulas stop feeling like magic. Every chapter has a concept video, a worked-example session and a problem set graded by difficulty. Classes run live on Zoom for a maximum of 10 students, with recordings and scanned notes after each session. Great for students targeting 90%+ in Higher Math and engineering admission.' },
  { no: 4, tutor: 't02', title: 'Class 6-8 Math Foundation Batch (small group)', subject: 'Mathematics', classLevel: 'Class 6-8', mode: 'Offline', location: 'Sector 7, Uttara, Dhaka', monthlyFee: 3000, daysPerWeek: 3, schedule: 'Sun, Tue, Thu · 4:00–5:30 PM', banner: 'math-1', status: 'approved', active: true, daysAgo: 8,
    description: 'A friendly small-group batch that rebuilds the basics — fractions, ratios, algebra and geometry — before the school syllabus gets harder. Lessons use real-life examples and short puzzles, with homework checked at the start of every class. Maximum six students per batch at the tutor’s Uttara learning corner. Parents receive a short progress note every month.' },
  { no: 5, tutor: 't03', title: 'IELTS Academic 7+ — Speaking & Writing intensive', subject: 'IELTS', classLevel: 'Professional', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 3500, daysPerWeek: 3, schedule: 'Sat, Mon, Wed · 7:30–9:00 PM', banner: 'ielts-1', status: 'approved', active: true, daysAgo: 2,
    description: 'An intensive online programme focused on the two skills students struggle with most: Speaking and Writing. Learners write two full Task 2 essays each week and receive line-by-line feedback with band-score estimates, plus weekly mock speaking sessions recorded for review. Reading and Listening strategy workshops are included. Taught by a tutor with an overall band 8.0 who has coached over 150 students.' },
  { no: 6, tutor: 't03', title: 'SSC English 1st & 2nd Paper with grammar drills', subject: 'English', classLevel: 'Class 9-10 (SSC)', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 1800, daysPerWeek: 3, schedule: 'Sun, Tue, Thu · 6:00–7:00 PM', banner: 'english-1', status: 'approved', active: true, daysAgo: 18,
    description: 'Covers English 1st and 2nd Paper for SSC with a strong focus on writing: paragraphs, applications, letters and composition, plus the grammar items that carry the most marks. Each week has a vocabulary drill and a short reading comprehension practice. Live online classes with recorded replays. Students submit written work through Google Docs and get corrected copies within 48 hours.' },
  { no: 7, tutor: 't04', title: 'HSC Chemistry: organic reactions without memorising', subject: 'Chemistry', classLevel: 'Class 11-12 (HSC)', mode: 'Offline', location: 'Mirpur-10, Dhaka', monthlyFee: 4000, daysPerWeek: 3, schedule: 'Sat, Mon, Wed · 6:30–8:00 PM', banner: 'chemistry-1', status: 'approved', active: true, daysAgo: 6,
    description: 'Organic chemistry is taught through reaction maps and mechanisms rather than lists to memorise. The batch also covers quantitative chemistry and chemical changes with plenty of numerical practice. Classes are held in person in Mirpur-10 with a limit of 12 students; every chapter ends with a one-hour test. Lab-style demonstrations explain the practical-exam questions.' },
  { no: 8, tutor: 't05', title: 'Medical Admission Biology (Zoology + Botany) crash batch', subject: 'Biology', classLevel: 'Admission Prep', mode: 'Online', location: 'Online (Zoom)', monthlyFee: 2500, daysPerWeek: 4, schedule: 'Sat–Tue · 9:00–10:30 PM', banner: 'biology-1', status: 'approved', active: true, daysAgo: 5,
    description: 'A focused crash course across Zoology and Botany for medical admission candidates. Each chapter is covered in two sessions: a high-yield concept review followed by 40 MCQs under time pressure with explanations. Includes weekly model tests aligned with recent admission patterns and a revision calendar. A shared question bank is updated after every test.' },
  { no: 9, tutor: 't06', title: 'Python for Beginners — build five small projects', subject: 'Programming', classLevel: 'Professional', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 3000, daysPerWeek: 2, schedule: 'Fri, Sat · 8:00–10:00 PM', banner: 'programming-1', status: 'approved', active: true, daysAgo: 1,
    description: 'Start from zero and finish with five small projects — a unit converter, quiz game, expense tracker, web scraper and a simple chatbot. Sessions are hands-on: you write code in every class and push it to your own GitHub repository. No prior programming experience needed; a laptop with internet is enough. Suitable for school students from Class 9 and for working adults switching careers.' },
  { no: 10, tutor: 't06', title: 'Web Development Basics: HTML, CSS and JavaScript', subject: 'Programming', classLevel: 'University', mode: 'Online', location: 'Online (Zoom)', monthlyFee: 3500, daysPerWeek: 2, schedule: 'Sun, Wed · 9:00–10:30 PM', banner: 'programming-2', status: 'approved', active: true, daysAgo: 27,
    description: 'Learn how websites are built by building one. Over eight weeks you will move from HTML and CSS layouts to JavaScript interactivity and finish with a deployed personal portfolio. Weekly assignments are reviewed one-to-one with clear next steps. Ideal for university students who want a first internship-ready project.' },
  { no: 11, tutor: 't07', title: 'SSC Bangla 1st & 2nd Paper — writing and grammar', subject: 'Bangla', classLevel: 'Class 9-10 (SSC)', mode: 'Offline', location: 'Agrabad, Chattogram', monthlyFee: 3200, daysPerWeek: 3, schedule: 'Sat, Mon, Wed · 4:30–6:00 PM', banner: 'bangla-1', status: 'approved', active: true, daysAgo: 16,
    description: 'Dedicated preparation for SSC Bangla 1st and 2nd Paper — from poetry and prose analysis to grammar, applications and composition. Students practise writing under exam conditions every second class and receive detailed corrections. Batches are limited to ten students. A monthly parent update keeps progress transparent.' },
  { no: 12, tutor: 't08', title: 'HSC Accounting (Business Studies) — complete syllabus', subject: 'Accounting', classLevel: 'Class 11-12 (HSC)', mode: 'Offline', location: 'Mohammadpur, Dhaka', monthlyFee: 4200, daysPerWeek: 3, schedule: 'Sun, Tue, Thu · 5:00–6:30 PM', banner: 'accounting-1', status: 'approved', active: true, daysAgo: 10,
    description: 'Complete HSC Accounting coverage for Business Studies students: journal and ledger, trial balance, financial statements, partnership and company accounts. Each topic is taught with a worked problem first, then graded practice questions to build speed. Classes meet in Mohammadpur with a maximum of 12 students. Includes model tests before every terminal exam.' },
  { no: 13, tutor: 't09', title: 'HSC ICT: programming chapter and MCQ practice', subject: 'ICT', classLevel: 'Class 11-12 (HSC)', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 1500, daysPerWeek: 2, schedule: 'Mon, Thu · 7:00–8:15 PM', banner: 'ict-1', status: 'approved', active: true, daysAgo: 14,
    description: 'An exam-focused online batch for HSC ICT: number systems, Boolean algebra, web design basics and the programming chapter, plus daily MCQ practice. The tutor breaks each topic into short, memorable steps and shares a one-page summary after every class. Classes run twice a week, so it fits easily alongside other coaching. Perfect for students who want full marks in the practical and MCQ sections.' },
  { no: 14, tutor: 't10', title: 'Principles of Economics — university first-year support', subject: 'Economics', classLevel: 'University', mode: 'Online', location: 'Online (Zoom)', monthlyFee: 2200, daysPerWeek: 2, schedule: 'Tue, Fri · 8:30–10:00 PM', banner: 'economics-1', status: 'approved', active: true, daysAgo: 21,
    description: 'First-year university economics support covering demand and supply, elasticity, consumer theory, costs and market structures. Sessions combine short lectures with graph-drawing practice and past-paper questions from public university exams. Online in small groups so everyone can ask questions. Includes a printable diagram book and a final revision week.' },
  { no: 15, tutor: 't11', title: 'SSC General Math — step-by-step problem solving', subject: 'Mathematics', classLevel: 'Class 9-10 (SSC)', mode: 'Offline', location: 'Zindabazar, Sylhet', monthlyFee: 3500, daysPerWeek: 3, schedule: 'Sat, Mon, Wed · 4:00–5:30 PM', banner: 'math-2', status: 'approved', active: true, daysAgo: 30,
    description: 'A patient, step-by-step approach to SSC General Math — algebra, geometry, trigonometry and mensuration. We solve every textbook example first, then tackle exam-pattern problems in increasing difficulty. In-person classes in Zindabazar with a maximum of eight students. Weekly tests and one-to-one help for topics a student finds hard.' },
  { no: 16, tutor: 't12', title: 'Engineering Admission Physics (BUET, CUET, RUET)', subject: 'Physics', classLevel: 'Admission Prep', mode: 'Offline', location: 'Binodpur, Rajshahi', monthlyFee: 5000, daysPerWeek: 4, schedule: 'Sat–Tue · 6:00–7:30 PM', banner: 'physics-1', status: 'approved', active: true, daysAgo: 33,
    description: 'Problem-solving classes for engineering admission candidates. Each session targets one theme, such as mechanics or modern physics, with shortcuts, dimensional-analysis tricks and previous-year questions. Strictly limited to 10 students with a weekly timed mock exam. Students receive a curated problem bank sorted by difficulty.' },
  { no: 17, tutor: 't05', title: 'Class 9-10 Biology Concept Batch (currently full)', subject: 'Biology', classLevel: 'Class 9-10 (SSC)', mode: 'Offline', location: 'Mohakhali, Dhaka', monthlyFee: 3000, daysPerWeek: 3, schedule: 'Sun, Tue, Thu · 5:00–6:30 PM', banner: 'biology-2', status: 'approved', active: false, daysAgo: 36,
    description: 'A concept-first biology batch for SSC students covering cell structure, genetics, human physiology and ecology with labelled diagram practice. The batch is currently full and not accepting new enrolments, but a new session will open soon. Weekly class tests and diagram drills keep students ready for the board exam.' },
  { no: 18, tutor: 't11', title: 'Class 6-8 Science & Math Combo (batch full)', subject: 'Mathematics', classLevel: 'Class 6-8', mode: 'Offline', location: 'Subid Bazar, Sylhet', monthlyFee: 2800, daysPerWeek: 3, schedule: 'Fri, Sat, Sun · 10:00–11:30 AM', banner: 'math-1', status: 'approved', active: false, daysAgo: 38,
    description: 'A combined science and math support batch for Class 6-8 students who need regular guidance with homework and exam preparation. Hands-on explanations and weekly revision quizzes keep learning steady. This session is full and a second batch is being planned for next term.' },
  { no: 19, tutor: 't02', title: 'University Calculus and Linear Algebra support', subject: 'Higher Mathematics', classLevel: 'University', mode: 'Online', location: 'Online (Zoom)', monthlyFee: 3000, daysPerWeek: 2, schedule: 'Thu, Sat · 9:30–11:00 PM', banner: 'higher-math-2', status: 'pending', active: true, daysAgo: 1,
    description: 'Weekly sessions for first- and second-year university students: limits, derivatives, integrals, matrices and eigenvalues. Each class pairs a clear explanation with tutorial-style problem solving and previous-year questions from public universities. Online with recordings and a shared notes folder.' },
  { no: 20, tutor: 't04', title: 'Chemistry Admission Prep — medical and engineering', subject: 'Chemistry', classLevel: 'Admission Prep', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 2600, daysPerWeek: 3, schedule: 'Sun, Tue, Thu · 8:30–10:00 PM', banner: 'chemistry-2', status: 'pending', active: true, daysAgo: 2,
    description: 'Revision-style course for admission candidates, built around high-yield topics, previous-year MCQs and weekly timed tests. Covers physical, organic and inorganic chemistry with memory aids that actually stick. Live online sessions and a shared question bank.' },
  { no: 21, tutor: 't09', title: 'Intro to Web Development for SSC students', subject: 'ICT', classLevel: 'Class 9-10 (SSC)', mode: 'Online', location: 'Online (Google Meet)', monthlyFee: 1800, daysPerWeek: 2, schedule: 'Sat, Tue · 5:00–6:00 PM', banner: 'ict-2', status: 'pending', active: true, daysAgo: 4,
    description: 'A gentle introduction to HTML, CSS and basic JavaScript for SSC students curious about technology. Students build a small personal page in the first two weeks and add features each class. Online, with a limit of eight learners so every question gets answered.' },
  { no: 22, tutor: 't10', title: 'Guaranteed GPA 5 in 30 days — all subjects', subject: 'Economics', classLevel: 'Class 11-12 (HSC)', mode: 'Online', location: 'Online', monthlyFee: 999, daysPerWeek: 7, schedule: '', banner: 'economics-2', status: 'rejected', active: true, daysAgo: 7,
    description: 'Join now and get GPA 5 in just 30 days with our special guaranteed method. Limited seats, call today for a huge discount on all subjects!' },
];

// [student, tuition no, status, rating (null = not reviewed), days ago]
export const applications = [
  ['s01', 1, 'accepted', 5, 20], ['s01', 6, 'accepted', null, 9], ['s01', 15, 'pending', null, 3], ['s01', 11, 'rejected', null, 14],
  ['s02', 3, 'accepted', 5, 17], ['s02', 2, 'accepted', 4, 15], ['s02', 8, 'pending', null, 2], ['s02', 12, 'pending', null, 4],
  ['s03', 1, 'pending', null, 5], ['s03', 7, 'accepted', 4, 12], ['s03', 4, 'rejected', null, 11],
  ['s04', 1, 'accepted', 5, 19], ['s04', 4, 'pending', null, 6],
  ['s05', 3, 'pending', null, 2], ['s05', 13, 'accepted', 5, 10],
  ['s06', 9, 'accepted', 5, 8], ['s06', 10, 'accepted', 4, 13],
  ['s07', 6, 'accepted', 4, 16], ['s07', 11, 'pending', null, 7],
  ['s08', 16, 'accepted', 5, 18], ['s08', 12, 'pending', null, 5],
  ['s09', 5, 'accepted', 5, 11], ['s09', 6, 'pending', null, 3],
  ['s10', 12, 'accepted', 4, 14], ['s10', 7, 'rejected', null, 15],
  ['s11', 2, 'pending', null, 6], ['s11', 15, 'accepted', 4, 22],
  ['s12', 9, 'pending', null, 1], ['s12', 10, 'pending', null, 2],
  ['s13', 2, 'rejected', null, 8], ['s13', 8, 'accepted', 5, 9],
  ['s14', 14, 'accepted', 3, 19], ['s14', 5, 'pending', null, 4],
  ['s15', 3, 'pending', null, 1], ['s15', 4, 'accepted', 5, 12],
  ['s16', 8, 'pending', null, 3], ['s16', 16, 'pending', null, 6], ['s16', 13, 'rejected', null, 7],
];

export const schedules = [
  'Weekday evenings after 6 PM', 'Saturday and Monday evenings', 'Friday morning or evening', 'Sunday, Tuesday, Thursday after school',
  'Any evening between 7 and 9 PM', 'Weekends only, mornings preferred',
];
export const notes = [
  'I struggle most with the tougher chapters and would like regular practice tests before my exams.',
  'My board exams are in a few months and I want to build a strong foundation first.',
  'I am comfortable with the basics but lose marks on long problems. Please help me improve speed.',
  'My parents would like a monthly progress update. I can attend regularly.',
  '',
  'I have attended another coaching class but could not follow it. A smaller group would suit me better.',
];

export const feedback = {
  5: [
    'Concepts finally clicked after the first two weeks. The weekly tests kept me on track and my class test marks improved a lot.',
    'Very patient and well prepared. Every class had a clear plan and the notes were easy to revise from.',
    'Best decision I made this term. Explanations are simple and the feedback on my practice work is detailed.',
    'Highly recommended — responds to doubts quickly and never makes you feel silly for asking.',
    'The structure of the batch is excellent. I knew exactly what to study after each class.',
    'Great teaching style and honest feedback. I went from guessing to actually understanding.',
  ],
  4: [
    'Good batch with clear explanations. I would like a bit more time for questions, but overall very helpful.',
    'Solid teaching and useful practice material. Classes sometimes run over time, but the content is worth it.',
    'Helpful and well organised. The pace was fast at the start but it got comfortable after a week.',
    'Well-prepared lessons and fair tests. A few more worked examples would make it perfect.',
  ],
  3: ['Useful content, but the schedule changed twice. The teaching itself is good and I am learning steadily.'],
};

export const bookmarks = { s01: [2, 9, 12], s02: [5, 8], s03: [3, 10], s05: [1, 6, 14], s07: [7], s11: [4, 16] };
