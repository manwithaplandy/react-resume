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
// import StackOverflowIcon from '../components/Icon/StackOverflowIcon';
// import TwitterIcon from '../components/Icon/TwitterIcon';
import heroImage from '../images/header-background.webp';
import porfolioImage1 from '../images/portfolio/portfolio-1.jpg';
import porfolioImage2 from '../images/portfolio/portfolio-2.jpg';
import porfolioImage3 from '../images/portfolio/portfolio-3.jpg';
import porfolioImage4 from '../images/portfolio/portfolio-4.jpg';
import profilepic from '../images/profilepic.jpg';
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
    date: 'March 2010 - Present',
    location: 'Awesome Development Company',
    title: 'Senior UX Engineer',
    content: (
      <p>
        Describe work, special projects, notable achievements, what technologies you have been working with, and
        anything else that would be useful for an employer to know.
      </p>
    ),
  },
  {
    date: 'March 2007 - February 2010',
    location: 'Garage Startup Studio',
    title: 'Junior bug fixer',
    content: (
      <p>
        Describe work, special projects, notable achievements, what technologies you have been working with, and
        anything else that would be useful for an employer to know.
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
      name: 'John Doe',
      text: 'Use this as an opportunity to promote what it is like to work with you. High value testimonials include ones from current or past co-workers, managers, or from happy clients.',
      image: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/169.jpg',
    },
    {
      name: 'Jane Doe',
      text: 'Here you should write some nice things that someone has said about you. Encourage them to be specific and include important details (notes about a project you were on together, impressive quality produced, etc).',
      image: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/14.jpg',
    },
    {
      name: 'Someone else',
      text: 'Add several of these, and keep them as fresh as possible, but be sure to focus on quality testimonials with strong highlights of your skills/work ethic.',
      image: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/69.jpg',
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
