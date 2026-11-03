import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Невалиден имейл адрес.'),
  password: z.string().min(6, 'Паролата трябва да съдържа поне 6 символа.'),
});

export const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'ПИН кодът трябва да съдържа точно 4 цифри.'),
});

export const pinSetupSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'ПИН кодът трябва да съдържа точно 4 цифри.'),
    confirmPin: z.string().regex(/^\d{4}$/, 'ПИН кодът трябва да съдържа точно 4 цифри.'),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'Двата ПИН кода не съвпадат.',
    path: ['confirmPin'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type PinInput = z.infer<typeof pinSchema>;
export type PinSetupInput = z.infer<typeof pinSetupSchema>;
