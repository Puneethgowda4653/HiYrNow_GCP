import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-faq-section',
  templateUrl: './faq-section.component.html',
  styleUrls: ['./faq-section.component.css'],
})
export class FaqSectionComponent {
  employerFaqs = [
    {
      question: 'How quickly can I hire using HiYrNow?',
      answer:
        'Many employers fill positions within 48 hours thanks to our AI-powered candidate matching and instant notifications.',
      open: false,
    },
    {
      question: 'Is there a free trial for employers?',
      answer:
        'Yes, new employers get a free trial to experience our platform before committing to a subscription.',
      open: false,
    },
    {
      question: 'Can I hire for multiple locations?',
      answer:
        'Absolutely. Post jobs across multiple cities in India and manage all applicants from one central dashboard.',
      open: false,
    },
  ];

  jobSeekerFaqs = [
    {
      question: 'Is HiYrNow free for job seekers?',
      answer:
        'Yes! You can browse jobs, apply, and track your applications at no cost.',
      open: false,
    },
    {
      question: 'How does the AI job matching work?',
      answer:
        'Our AI analyzes your skills, experience, and preferences to match you with the most relevant job opportunities.',
      open: false,
    },
    {
      question: 'Can I apply for remote jobs?',
      answer:
        'Yes, HiYrNow lists remote opportunities as well as jobs in cities across India.',
      open: false,
    },
  ];

  toggleEmployerFaq(index: number) {
    this.employerFaqs[index].open = !this.employerFaqs[index].open;
  }

  toggleJobSeekerFaq(index: number) {
    this.jobSeekerFaqs[index].open = !this.jobSeekerFaqs[index].open;
  }
}
