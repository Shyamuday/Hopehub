import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContactForm } from '../models/contact.model';

export interface TelegramResponse {
    ok: boolean;
    result?: any;
    error_code?: number;
    description?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TelegramService {
    private http = inject(HttpClient);

    private readonly botToken = environment.telegramBotToken;
    private readonly chatId = environment.telegramChatId;
    private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

    /**
     * Send contact form data to Telegram
     */
    sendContactForm(formData: ContactForm): Observable<boolean> {
        if (!this.botToken || !this.chatId) {
            return throwError(() => new Error('Telegram configuration is missing'));
        }

        const message = this.formatContactMessage(formData);

        return this.sendMessage(message).pipe(
            map(response => response.ok),
            catchError(error => {
                console.error('Failed to send message to Telegram:', error);
                return throwError(() => new Error('Failed to send message to Telegram'));
            })
        );
    }

    /**
     * Send a general message to Telegram
     */
    sendMessage(text: string): Observable<TelegramResponse> {
        const url = `${this.apiUrl}/sendMessage`;
        const payload = {
            chat_id: this.chatId,
            text: text,
            parse_mode: 'HTML'
        };

        return this.http.post<TelegramResponse>(url, payload).pipe(
            catchError(error => {
                console.error('Telegram API error:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Send a notification about a new service inquiry
     */
    sendServiceInquiry(serviceName: string, userInfo: { name: string; email: string; message?: string }): Observable<boolean> {
        const message = this.formatServiceInquiryMessage(serviceName, userInfo);

        return this.sendMessage(message).pipe(
            map(response => response.ok),
            catchError(error => {
                console.error('Failed to send service inquiry to Telegram:', error);
                return throwError(() => new Error('Failed to send service inquiry'));
            })
        );
    }

    /**
     * Format contact form data into a readable Telegram message
     */
    private formatContactMessage(formData: ContactForm): string {
        const timestamp = new Date().toLocaleString();

        let message = `🆕 <b>New Contact Form Submission</b>\n\n`;
        message += `📅 <b>Date:</b> ${timestamp}\n`;
        message += `👤 <b>Name:</b> ${formData.name}\n`;
        message += `📧 <b>Email:</b> ${formData.email}\n`;

        if (formData.phone) {
            message += `📱 <b>Phone:</b> ${formData.phone}\n`;
        }

        if (formData.serviceInterest) {
            message += `🎯 <b>Service Interest:</b> ${this.formatServiceName(formData.serviceInterest)}\n`;
        }

        // Add pre-filled service information if available (from carousel booking)
        if ((formData as any).selectedService && (formData as any).selectedConsultant) {
            message += `\n🎯 <b>Selected Service Details:</b>\n`;
            message += `🏥 <b>Service:</b> ${(formData as any).selectedService}\n`;
            message += `👨‍⚕️ <b>Preferred Consultant:</b> ${(formData as any).selectedConsultant}\n`;

            if ((formData as any).sessionDuration) {
                message += `⏱️ <b>Session Duration:</b> ${(formData as any).sessionDuration}\n`;
            }

            if ((formData as any).consultantPhone) {
                message += `📞 <b>Consultant Contact:</b> ${(formData as any).consultantPhone}\n`;
            }

            if ((formData as any).bookingSource) {
                message += `📍 <b>Booking Source:</b> ${(formData as any).bookingSource}\n`;
            }
        }

        // Add appointment information if available
        if ((formData as any).appointmentDate && (formData as any).appointmentTime) {
            message += `\n📅 <b>Preferred Appointment:</b>\n`;
            message += `🗓️ <b>Date:</b> ${(formData as any).appointmentDate}\n`;
            message += `⏰ <b>Time:</b> ${(formData as any).appointmentTime}\n`;
        }

        message += `📞 <b>Preferred Contact:</b> ${this.formatContactMethod(formData.preferredContact)}\n\n`;
        message += `💬 <b>Message:</b>\n${formData.message}\n\n`;

        if ((formData as any).appointmentDate) {
            message += `⚠️ <b>Note:</b> Customer has selected a preferred appointment slot. Please confirm availability.\n\n`;
        }

        if ((formData as any).selectedService && (formData as any).selectedConsultant) {
            message += `🎯 <b>Action Required:</b> Customer came from services carousel and is interested in booking with specific consultant. Priority follow-up recommended.\n\n`;
        }

        message += `🌐 <b>Source:</b> Healing Hub Website`;

        return message;
    }

    /**
     * Format service inquiry message
     */
    private formatServiceInquiryMessage(serviceName: string, userInfo: { name: string; email: string; message?: string }): string {
        const timestamp = new Date().toLocaleString();

        let message = `🎯 <b>New Service Inquiry</b>\n\n`;
        message += `📅 <b>Date:</b> ${timestamp}\n`;
        message += `🏥 <b>Service:</b> ${serviceName}\n`;
        message += `👤 <b>Name:</b> ${userInfo.name}\n`;
        message += `📧 <b>Email:</b> ${userInfo.email}\n`;

        if (userInfo.message) {
            message += `\n💬 <b>Additional Info:</b>\n${userInfo.message}\n`;
        }

        message += `\n🌐 <b>Source:</b> Healing Hub Website`;

        return message;
    }

    /**
     * Format service name for display
     */
    private formatServiceName(serviceKey: string): string {
        // Handle both old format (kebab-case) and new format (Title Case)
        const serviceNames: { [key: string]: string } = {
            'breakup-counseling': 'Breakup Counseling',
            'career-counseling': 'Career Counseling',
            'anxiety-therapy': 'Anxiety Therapy',
            'depression-support': 'Depression Support',
            'relationship-counseling': 'Relationship Counseling',
            'stress-management': 'Stress Management',
            'grief-counseling': 'Grief Counseling',
            'family-therapy': 'Family Therapy',
            'addiction-support': 'Addiction Support',
            'self-esteem-coaching': 'Self-Esteem Coaching',
            // New format (Title Case) - return as is
            'Breakup Counseling': 'Breakup Counseling',
            'Career Counseling': 'Career Counseling',
            'Anxiety Therapy': 'Anxiety Therapy',
            'Depression Support': 'Depression Support',
            'Relationship Counseling': 'Relationship Counseling',
            'Stress Management': 'Stress Management',
            'Grief Counseling': 'Grief Counseling',
            'Family Therapy': 'Family Therapy',
            'Addiction Support': 'Addiction Support',
            'Self-Esteem Coaching': 'Self-Esteem Coaching'
        };

        return serviceNames[serviceKey] || serviceKey;
    }

    /**
     * Format contact method for display
     */
    private formatContactMethod(method: string): string {
        const methods: { [key: string]: string } = {
            'email': '📧 Email',
            'phone': '📱 Phone',
            'telegram': '💬 Telegram'
        };

        return methods[method] || method;
    }

    /**
     * Test Telegram connection
     */
    testConnection(): Observable<boolean> {
        const testMessage = `🧪 <b>Test Message</b>\n\nTelegram integration is working correctly!\n\n📅 ${new Date().toLocaleString()}`;

        return this.sendMessage(testMessage).pipe(
            map(response => response.ok),
            catchError(() => throwError(() => new Error('Telegram connection test failed')))
        );
    }
}