import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '600ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('staggeredFadeIn', [
      transition(
        ':enter',
        [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate(
            '600ms {{delay}}ms ease-out',
            style({ opacity: 1, transform: 'translateY(0)' })
          ),
        ],
        { params: { delay: 0 } }
      ),
    ]),
  ],
})
export class AboutComponent {
  sections = [
    {
      title: 'Born from a Dream',
      content:
        'HiYrNow was born not in a boardroom, but in the quiet frustration of watching great people go unnoticed. We saw jobseekers filled with passion and potential, constantly being overlooked. And we saw companies hungry for talent, stuck in outdated hiring models. We knew there had to be a better way—so we built it.',
    },
    {
      title: 'The Human Side of Hiring',
      content:
        "We're not just another job portal. We're a movement. A mission. A platform powered by AI, empathy, and ambition. Our AI doesn't just scan keywords—it understands people. It reads between the lines. It sees the spark in a side project, the grit behind a gap year, the strength in a career pivot. Because hiring isn't just about qualifications. It's about people meeting purpose. And that's what we do best.",
    },
    {
      title: 'For Jobseekers',
      content:
        "Whether you're a recent graduate, a seasoned professional, or someone bravely starting over—HiYrNow is your launchpad. We'll help you discover your strengths, tell your story, and connect you to opportunities that truly fit. You deserve to be seen. To be heard. To be hired—not just for what you've done, but for what you can do.",
    },
    {
      title: 'For Employers',
      content:
        "You're not just filling a role. You're building a team. A culture. A future. HiYrNow helps you find the kind of people who don't just tick boxes but move the needle. Those who believe in what you're building—because we believe in them.",
    },
    {
      title: 'Our Promise',
      content:
        'We are not here to follow the crowd. We are here to lead a revolution. A revolution where hiring is more human, more honest, and more hopeful. At HiYrNow, every resume is a story. Every interview is a conversation. Every match is a moment of magic.',
    },
  ];

  constructor() {}

  ngOnInit(): void {}
}
