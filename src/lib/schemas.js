import { z } from 'zod';
import { CLASS_LEVELS, MODES, ROLES, APPROVAL_STATUSES } from './constants.js';

const phoneRx = /^[+0-9][0-9\s\-()]{6,18}$/;
const imageRef = z
  .string()
  .trim()
  .max(500, 'Image link is too long')
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || v.startsWith('/'), 'Use a full image URL (https://…)');

const tuitionFields = {
  title: z.string().trim().min(5, 'Title needs at least 5 characters').max(120, 'Title can be at most 120 characters'),
  subject: z.string().trim().min(2, 'Choose a subject').max(60),
  classLevel: z.enum(CLASS_LEVELS, 'Choose a class level'),
  mode: z.enum(MODES, 'Choose Online or Offline'),
  location: z.string().trim().min(2, 'Add a location').max(120),
  monthlyFee: z.coerce.number('Enter the monthly fee').int('Fee must be a whole number').min(100, 'Fee must be at least ৳100').max(100000, 'Fee can be at most ৳100,000'),
  daysPerWeek: z.coerce.number('Enter days per week').int().min(1, 'At least 1 day per week').max(7, 'At most 7 days per week'),
  schedule: z.string().trim().max(120, 'Schedule can be at most 120 characters'),
  description: z.string().trim().min(30, 'Describe the batch in at least 30 characters').max(2000, 'Description can be at most 2000 characters'),
  bannerImage: imageRef,
};

export const createTuitionSchema = z.object({
  ...tuitionFields,
  schedule: tuitionFields.schedule.optional(),
  bannerImage: tuitionFields.bannerImage.optional(),
});
export const updateTuitionSchema = z.object(tuitionFields).partial();
export const tuitionStatusSchema = z.object({ isActive: z.boolean('isActive must be true or false') });
export const approvalSchema = z.object({ approvalStatus: z.enum(APPROVAL_STATUSES, 'Invalid approval status') });

export const applicationSchema = z.object({
  tuitionId: z.string().trim().min(1, 'tuitionId is required'),
  studentPhone: z.string().trim().regex(phoneRx, 'Enter a valid phone number'),
  preferredSchedule: z.string().trim().min(3, 'Tell the tutor your preferred schedule').max(120),
  studentNote: z.string().trim().max(600, 'Note can be at most 600 characters').optional(),
});
export const applicantStatusSchema = z.object({ status: z.enum(['accepted', 'rejected'], 'Status must be accepted or rejected') });
export const reviewSchema = z.object({
  rating: z.coerce.number('Choose a rating').int().min(1, 'Choose 1 to 5 stars').max(5, 'Choose 1 to 5 stars'),
  feedback: z.string().trim().min(5, 'Write at least 5 characters').max(500, 'Feedback can be at most 500 characters'),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name needs at least 2 characters').max(60),
    phone: z.string().trim().refine((v) => v === '' || phoneRx.test(v), 'Enter a valid phone number'),
    bio: z.string().trim().max(400, 'Bio can be at most 400 characters'),
    image: imageRef,
  })
  .partial();
export const roleSchema = z.object({ role: z.enum(ROLES, 'Role must be student, tutor or admin') });
