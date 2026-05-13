export const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const LOGOUT_ERROR_CODES = ['user_not_found', 'user_inactive', 'token_not_valid'];

export const AUTH_MESSAGES = {
    // Success
    register_success: 'Registration successful! Please check your email.',
    resent_code: 'Confirmation code resent.',
    email_confirmed: 'Email confirmed successfully.',
    email_confirmed_and_logged_in: 'Email confirmed. You are now logged in.',
    email_sent: 'Email sent successfully.',
    password_reset_success: 'Password changed successfully.',
    password_reset_request_success: 'Password reset successful.',

    // Errors
    error: 'An error occurred. Please try again.',
    passwords_mismatch: 'Passwords do not match.',
    bad_email: 'Invalid email address.',
    bad_data: 'Invalid data provided.',
    invalid_data: 'Invalid or expired link.',
    wrong_data: 'Incorrect email or password.',
    reset_psw: 'Please reset your password.',
    account_block: 'Your account has been blocked.',
    invalid: 'Invalid credentials.',
} as const;
