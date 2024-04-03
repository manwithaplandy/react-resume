import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  FlagIcon,
  MapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import GithubIcon from '../components/Icon/GithubIcon';
// import InstagramIcon from '../components/Icon/InstagramIcon';
import LinkedInIcon from '../components/Icon/LinkedInIcon';
import darwin from '../images/darwin.jpg'
import downeyjr from '../images/downeyjr.jpg'
// import StackOverflowIcon from '../components/Icon/StackOverflowIcon';
// import TwitterIcon from '../components/Icon/TwitterIcon';
import heroImage from '../images/header-background.webp';
import porfolioImage1 from '../images/portfolio/portfolio-1.jpg';
import porfolioImage2 from '../images/portfolio/portfolio-2.jpg';
import porfolioImage3 from '../images/portfolio/portfolio-3.jpg';
import porfolioImage4 from '../images/portfolio/portfolio-4.jpg';
import profilepic from '../images/profilepic.jpg';
import stevejobs from '../images/stevejobs.jpg'
import testimonialImage from '../images/testimonial.webp';
import {
  About,
  ContactSection,
  ContactType,
  Hero,
  HomepageMeta,
  PortfolioItem,
  SkillGroup,
  Social,
  TestimonialSection,
  TimelineItem,
} from './dataDef';

/**
 * Page meta data
 */
export const homePageMeta: HomepageMeta = {
  title: "Andrew's Resume",
  description: "Resume website built with React, and hosted on AWS.",
};

/**
 * Section definition
 */
export const SectionId = {
  Hero: 'hero',
  About: 'about',
  Contact: 'contact',
  Portfolio: 'portfolio',
  Resume: 'resume',
  Skills: 'skills',
  Stats: 'stats',
  Testimonials: 'testimonials',
} as const;

export type SectionId = (typeof SectionId)[keyof typeof SectionId];

/**
 * Hero section
 */
export const heroData: Hero = {
  imageSrc: heroImage,
  name: `I'm Andrew.`,
  description: (
    <>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        I'm a San Diego based <strong className="text-stone-100">DevOps Engineer</strong>, currently working
        at <strong className="text-stone-100">General Atomics</strong> helping to modernize and improve our cloud infrastructure.
      </p>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        In my free time time, you can catch me improving my <strong className="text-stone-100">engineering skills</strong>,
        playing with my <strong className="text-stone-100">cats</strong>, or exploring beautiful{' '}
        <strong className="text-stone-100">mountains</strong>.
      </p>
    </>
  ),
  actions: [
    {
      href: '/assets/resume.pdf',
      text: 'Resume',
      primary: true,
      Icon: ArrowDownTrayIcon,
    },
    {
      href: `#${SectionId.Contact}`,
      text: 'Contact',
      primary: false,
    },
  ],
};

/**
 * About section
 */
export const aboutData: About = {
  profileImageSrc: profilepic,
  description: `I'm a DevOps Engineer with over 5 years of experience in the IT industry, and a passion for technology and AI. My expertise lies in designing, implementing and managing cloud-based systems to ensure high availability and performance. I am proficient in AWS and Azure services and have hands-on experience with Docker, Kubernetes, Terraform, Ansible, and others.`,
  aboutItems: [
    {label: 'Location', text: 'San Diego, CA', Icon: MapIcon},
    {label: 'Age', text: '29', Icon: CalendarIcon},
    {label: 'Nationality', text: 'American', Icon: FlagIcon},
    {label: 'Interests', text: 'Camping, Motorsports, Golf', Icon: SparklesIcon},
    {label: 'Study', text: 'University of California, Santa Barbara', Icon: AcademicCapIcon},
    {label: 'Employment', text: 'General Atomics', Icon: BuildingOffice2Icon},
  ],
};

/**
 * Skills section
 */
export const skills: SkillGroup[] = [
  {
    name: 'DevOps Tools',
    skills: [
      {
        name: 'Docker',
        level: 9,
      },
      {
        name: 'Terraform',
        level: 7,
      },
      {
        name: 'Kubernetes',
        level: 5,
      },
      {
        name: 'Ansible',
        level: 5,
      }
    ],
  },
  {
    name: 'Coding Languages',
    skills: [
      {
        name: 'Python',
        level: 8,
      },
      {
        name: 'Javascript',
        level: 6,
      },
      {
        name: 'Bash',
        level: 6,
      },
      {
        name: 'Powershell',
        level: 6
      }
    ],
  },
  {
    name: 'Other Skills',
    skills: [
      {
        name: 'Generative AI',
        level: 9,
      },
      {
        name: 'Process Automation',
        level: 7,
      },
      {
        name: 'Learning new skills',
        level: 10,
      },
    ],
  },
  {
    name: 'Spoken languages',
    skills: [
      {
        name: 'English',
        level: 10,
      },
      {
        name: 'Spanish',
        level: 3,
      },
    ],
  },
];

/**
 * Portfolio section
 */
export const portfolioItems: PortfolioItem[] = [
  {
    title: 'Project title 1',
    description: 'Give a short description of your project here.',
    url: 'https://reactresume.com',
    image: porfolioImage1,
  },
  {
    title: 'Project title 2',
    description: 'Give a short description of your project here.',
    url: 'https://reactresume.com',
    image: porfolioImage2,
  },
  {
    title: 'Project title 3',
    description: 'Give a short description of your project here.',
    url: 'https://reactresume.com',
    image: porfolioImage3,
  },
  {
    title: 'Project title 4',
    description: 'Give a short description of your project here.',
    url: 'https://reactresume.com',
    image: porfolioImage4,
  }
];

/**
 * Resume section
 */
export const education: TimelineItem[] = [
  {
    date: 'September 2017',
    location: 'UC Santa Barbara',
    title: "Bachelor's - Psychology",
    content: <p></p>,
  }
];

export const experience: TimelineItem[] = [
  {
    date: 'February 2023 - Present',
    location: 'General Atomics',
    title: 'Systems Administrator',
    content: (
      <p>
        Working as a Systems Administrator, I am tasked with improving and modernizing the company's IT infrastructure. 
        I brought concepts of DevOps and Agile development to automate, innovate, and quickly generate value for the over 15000 end users.
        Additionally, I have spearheaded the team to implement generative AI to enable its use throughout the enterprise. 
        I have also personally developed a number of generative AI-powered applications to improve access to information for technicians and executives.
      </p>
    ),
  },
  {
    date: 'October 2021 - February 2023',
    location: 'Tillster, Inc.',
    title: 'IT Strategic Analyst',
    content: (
      <p>
        As an IT strategic analyst, it was my job to be tier 1 helpdesk, systems administrator, and automation engineer all at once. 
        I had to anticipate the needs of the end user, respond to them, and then work to implement solutions that met their needs. 
        I helped in the development of new internal tools using Python, js/jquery, Mulesoft, and others which significantly improved our efficiency. 
      </p>
    ),
  },
  {
    date: 'April 2018 - October 2021',
    location: 'Reynolds & Reynolds',
    title: 'Compliance & Marketing Consultant',
    content: (
      <p>
        At Reynolds & Reynolds, our clients were car dealerships across the country. 
        I was tasked with auditing their compliance with all of the relevant authorities, including local, state, federal, and corporate.
        Where there were inconsistencies or compliance failures, it was my job to resolve them quickly, and advise the client on preventing any future violations. 
        I also helped with marketing strategy and content creation.
      </p>
    ),
  },
];

/**
 * Testimonial section
 */
export const testimonial: TestimonialSection = {
  imageSrc: testimonialImage,
  testimonials: [
    {
      name: 'Steve Jobs',
      text: "This guy is an absolute revolutionary. The smartest guy I've ever worked with. He really understands what it means to think different",
      image: stevejobs,
    },
    {
      name: 'Charles Darwin',
      text: 'Having ventured to the far reaches of the Galápagos, I thought I had seen the pinnacle of evolution. Yet, upon my return, I encountered a marvel beyond natural selection: the technological prowess of Andrew. His ability to adapt and innovate in the digital ecosystem rivals that of the finches of my studies. Truly, Andrew is the missing link between chaos and digital enlightenment. His services come highly recommended for any species striving to evolve in the digital age.',
      image: darwin,
    },
    {
      name: 'Robert Downey Jr.',
      text: "How did you get in here? What is this?! Where is my security? And why are you wearing my hat?",
      image: downeyjr,
    },
  ],
};

/**
 * Contact section
 */

export const contact: ContactSection = {
  headerText: 'Get in touch.',
  description: 'For further inquiries or if you have any questions about my services, please feel free to contact me using the information below. I look forward to hearing from you soon.',
  items: [
    {
      type: ContactType.Email,
      text: 'andrewrmalvani@gmail.com',
      href: 'mailto:andrewrmalvani@gmail.com',
    },
    {
      type: ContactType.Location,
      text: 'San Diego, CA',
      href: 'https://maps.app.goo.gl/MsKa7QkkztT6s22u7',
    },
    {
      type: ContactType.Github,
      text: 'manwithaplandy',
      href: 'https://github.com/manwithaplandy',
    },
  ],
};

/**
 * Social items
 */
export const socialLinks: Social[] = [
  {label: 'Github', Icon: GithubIcon, href: 'https://github.com/manwithaplandy'},
  // {label: 'Stack Overflow', Icon: StackOverflowIcon, href: 'https://stackoverflow.com/users/8553186/tim-baker'},
  {label: 'LinkedIn', Icon: LinkedInIcon, href: 'https://www.linkedin.com/in/andrewmalvani'},
  // {label: 'Instagram', Icon: InstagramIcon, href: 'https://www.instagram.com/reactresume/'},
  // {label: 'Twitter', Icon: TwitterIcon, href: 'https://twitter.com/TimBakerx'},
];
