import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignupInput } from '@/types/user';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  general?: string;
}

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupInput>({
    email: '',
    password: '',
    confirmPassword: '',
    profile: {
      firstName: '',
      lastName: '',
      displayName: '',
    },
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // Name validation
    if (!formData.profile.firstName.trim()) {
      newErrors.firstName = '名前を入力してください';
    }

    if (!formData.profile.lastName.trim()) {
      newErrors.lastName = '姓を入力してください';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'パスワードは大文字、小文字、数字を含む必要があります';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード確認を入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Mock user creation - check if email already exists
      const existingUser = localStorage.getItem('registeredUsers');
      const users = existingUser ? JSON.parse(existingUser) : [];
      
      if (users.find((user: any) => user.email === formData.email)) {
        setErrors({
          general: 'このメールアドレスは既に登録されています',
        });
        return;
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(),
        email: formData.email,
        profile: {
          firstName: formData.profile.firstName,
          lastName: formData.profile.lastName,
          displayName: formData.profile.displayName || `${formData.profile.lastName} ${formData.profile.firstName}`,
        },
        role: 'member',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Store user in mock database
      users.push(newUser);
      localStorage.setItem('registeredUsers', JSON.stringify(users));

      // Auto-login the new user
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('isAuthenticated', 'true');

      // Redirect to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      setErrors({
        general: 'アカウントの作成に失敗しました。もう一度お試しください。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, isProfile = false) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (isProfile) {
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [field]: e.target.value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    }
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">新規登録</h1>
        <p className="text-gray-600">
          アカウントを作成してタスク管理を始めましょう
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              姓
            </label>
            <Input
              id="lastName"
              type="text"
              value={formData.profile.lastName}
              onChange={handleInputChange('lastName', true)}
              placeholder="田中"
              error={errors.lastName}
              disabled={isLoading}
              autoComplete="family-name"
            />
          </div>
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              名
            </label>
            <Input
              id="firstName"
              type="text"
              value={formData.profile.firstName}
              onChange={handleInputChange('firstName', true)}
              placeholder="太郎"
              error={errors.firstName}
              disabled={isLoading}
              autoComplete="given-name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="your.email@example.com"
            error={errors.email}
            disabled={isLoading}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            placeholder="パスワードを入力"
            error={errors.password}
            disabled={isLoading}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-gray-500">
            6文字以上、大文字・小文字・数字を含む
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード確認
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            placeholder="パスワードを再入力"
            error={errors.confirmPassword}
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                アカウント作成中...
              </>
            ) : (
              'アカウントを作成'
            )}
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちの方は{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              ログイン
            </Link>
          </p>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          アカウントを作成することで、{' '}
          <Link to="/terms" className="text-primary-600 hover:text-primary-500">
            利用規約
          </Link>{' '}
          及び{' '}
          <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
            プライバシーポリシー
          </Link>{' '}
          に同意したものとみなします。
        </p>
      </div>
    </div>
  );
};

export default SignupForm;