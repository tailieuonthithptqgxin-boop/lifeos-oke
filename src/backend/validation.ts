import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const LoginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Mật khẩu không được để trống')
}).refine(data => !!(data.identifier || data.email || data.username), {
  message: 'Vui lòng cung cấp email hoặc tên đăng nhập'
});

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Họ và tên là bắt buộc').max(100),
  email: z.string().email('Địa chỉ email không hợp lệ').max(150),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100)
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Mã khôi phục không hợp lệ'),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự')
});

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự')
});

export const FinanceTransactionSchema = z.object({
  accountId: z.string().min(1, 'Tài khoản nguồn là bắt buộc'),
  toAccountId: z.string().optional().nullable(),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  type: z.enum(['Thu nhập', 'Chi tiêu', 'Chuyển tiền']),
  category: z.string().default('Chung'),
  date: z.string().min(1, 'Ngày giao dịch là bắt buộc'),
  note: z.string().optional().nullable()
});

export const CouponValidateSchema = z.object({
  code: z.string().min(1, 'Mã giảm giá không được để trống')
});

export const CartCheckoutSchema = z.object({
  couponCode: z.string().optional().nullable()
});

export const SaaSCheckoutSessionSchema = z.object({
  plan: z.enum(['PERSONAL_1M', 'PERSONAL_3M', 'TEAM_1M', 'PRO', 'TEAM']),
  cycle: z.enum(['monthly', 'yearly', '1_MONTH', '3_MONTHS']).default('monthly'),
  couponCode: z.string().optional().nullable(),
  paymentMethod: z.enum(['vietqr', 'card', 'momo', 'bank_transfer']).default('vietqr')
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Mã đơn hàng không được để trống'),
  txReference: z.string().optional().nullable()
});

export const SubmitPaymentRequestSchema = z.object({
  orderId: z.string().min(1, 'Mã đơn hàng không được để trống'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional().nullable()
});

export const AdminRejectPaymentSchema = z.object({
  reason: z.string().min(1, 'Vui lòng cung cấp lý do từ chối').max(500)
});

export const AdminUpdateBankConfigSchema = z.object({
  bankName: z.string().min(1, 'Tên ngân hàng là bắt buộc'),
  accountNumber: z.string().min(1, 'Số tài khoản là bắt buộc'),
  accountHolder: z.string().min(1, 'Tên chủ tài khoản là bắt buộc'),
  transferPrefix: z.string().min(1, 'Cú pháp nội dung chuyển khoản là bắt buộc').default('DUOTECH'),
  bankCode: z.string().optional().default('MB'),
  qrImageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true)
});

export const UpgradePlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'TEAM']),
  cycle: z.enum(['monthly', 'yearly']).optional().default('monthly')
});

export const AdminCreateUserSchema = z.object({
  name: z.string().min(1, 'Tên người dùng là bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']).default('USER'),
  plan: z.enum(['FREE', 'PRO', 'TEAM']).default('FREE'),
  temporaryPassword: z.string().min(6, 'Mật khẩu tạm thời tối thiểu 6 ký tự').default('Password123!')
});

export const AdminUpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']),
  reason: z.string().optional().nullable()
});

export const AdminChangePlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'TEAM']),
  durationMonths: z.number().optional().nullable(),
  reason: z.string().optional().nullable()
});

export const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
  reason: z.string().optional().nullable()
});

export const AdminUpdatePlanSchema = z.object({
  name: z.string().min(1, 'Tên gói là bắt buộc'),
  description: z.string().min(1, 'Mô tả gói là bắt buộc'),
  monthlyPrice: z.number().min(0, 'Giá tháng không âm'),
  yearlyPrice: z.number().min(0, 'Giá năm không âm'),
  billingCycle: z.string().min(1, 'Chu kỳ thanh toán là bắt buộc'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  order: z.number().default(1),
  features: z.array(z.string()).default([]),
  quota: z.string().optional().nullable(),
  badge: z.string().optional().nullable()
});

export const AdminUpdateLanguagesSchema = z.object({
  languages: z.array(z.object({
    code: z.string().min(2, 'Mã ngôn ngữ tối thiểu 2 ký tự'),
    name: z.string().min(1, 'Tên ngôn ngữ là bắt buộc'),
    flag: z.string().min(1, 'Biểu tượng cờ là bắt buộc'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    isDefault: z.boolean().default(false)
  }))
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMsg = result.error.issues.map(e => e.message).join('; ');
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMsg,
          details: result.error.issues
        },
        message: errorMsg
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
