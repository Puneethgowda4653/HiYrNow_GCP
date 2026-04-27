import { trigger, transition, style, animate, query, stagger, keyframes } from '@angular/animations';

/**
 * 🎨 HiYrNow Premium Animations
 * Smooth, modern animations for Gen Z UI
 */

// Fade in animation
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 }))
  ])
]);

// Fade in with slide up
export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'translateY(20px)' 
    }),
    animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      opacity: 1, 
      transform: 'translateY(0)' 
    }))
  ])
]);

// Fade in with slide down
export const fadeInDown = trigger('fadeInDown', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'translateY(-20px)' 
    }),
    animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      opacity: 1, 
      transform: 'translateY(0)' 
    }))
  ])
]);

// Scale in animation
export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'scale(0.9)' 
    }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      opacity: 1, 
      transform: 'scale(1)' 
    }))
  ])
]);

// Slide in from left
export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'translateX(-30px)' 
    }),
    animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      opacity: 1, 
      transform: 'translateX(0)' 
    }))
  ])
]);

// Slide in from right
export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'translateX(30px)' 
    }),
    animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      opacity: 1, 
      transform: 'translateX(0)' 
    }))
  ])
]);

// Stagger list animation
export const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(20px)' 
      }),
      stagger(50, [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 1, 
          transform: 'translateY(0)' 
        }))
      ])
    ], { optional: true })
  ])
]);

// Card hover animation
export const cardHover = trigger('cardHover', [
  transition(':enter', [
    animate('300ms ease-out', keyframes([
      style({ transform: 'scale(1)', offset: 0 }),
      style({ transform: 'scale(1.02)', offset: 0.5 }),
      style({ transform: 'scale(1)', offset: 1 }),
    ]))
  ])
]);

// Bounce in animation
export const bounceIn = trigger('bounceIn', [
  transition(':enter', [
    animate('600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', keyframes([
      style({ opacity: 0, transform: 'scale(0.3)', offset: 0 }),
      style({ opacity: 1, transform: 'scale(1.05)', offset: 0.7 }),
      style({ transform: 'scale(0.95)', offset: 0.85 }),
      style({ transform: 'scale(1)', offset: 1 }),
    ]))
  ])
]);

// Fade out animation
export const fadeOut = trigger('fadeOut', [
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0 }))
  ])
]);

// Fade and slide out
export const fadeOutUp = trigger('fadeOutUp', [
  transition(':leave', [
    animate('300ms ease-in', style({ 
      opacity: 0, 
      transform: 'translateY(-20px)' 
    }))
  ])
]);

// Route transition animation
export const routeAnimation = trigger('routeAnimation', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%',
        opacity: 0,
        transform: 'scale(0.95)'
      })
    ], { optional: true }),
    query(':enter', [
      animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
        opacity: 1, 
        transform: 'scale(1)' 
      }))
    ], { optional: true })
  ])
]);

// Shimmer loading animation
export const shimmer = trigger('shimmer', [
  transition('* => *', [
    animate('1500ms ease-in-out', keyframes([
      style({ backgroundPosition: '-1000px 0', offset: 0 }),
      style({ backgroundPosition: '1000px 0', offset: 1 }),
    ]))
  ])
]);

// Rotate in animation
export const rotateIn = trigger('rotateIn', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'rotate(-180deg) scale(0)' 
    }),
    animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      opacity: 1, 
      transform: 'rotate(0) scale(1)' 
    }))
  ])
]);

// Slide toggle animation (for collapsible sections)
export const slideToggle = trigger('slideToggle', [
  transition(':enter', [
    style({ height: '0', opacity: 0, overflow: 'hidden' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      height: '*', 
      opacity: 1 
    }))
  ]),
  transition(':leave', [
    style({ height: '*', opacity: 1, overflow: 'hidden' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
      height: '0', 
      opacity: 0 
    }))
  ])
]);

// Pulse animation
export const pulse = trigger('pulse', [
  transition('* => *', [
    animate('1000ms ease-in-out', keyframes([
      style({ transform: 'scale(1)', offset: 0 }),
      style({ transform: 'scale(1.05)', offset: 0.5 }),
      style({ transform: 'scale(1)', offset: 1 }),
    ]))
  ])
]);

