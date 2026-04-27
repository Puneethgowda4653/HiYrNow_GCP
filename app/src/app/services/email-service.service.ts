import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  constructor(private http: HttpClient) {}

  sendEmail(userId: string, jobUrl: string) {
    // Replace this with your actual email sending logic
    console.log(`Sending email to user ID ${userId} with job URL: ${jobUrl}`);
  }
}