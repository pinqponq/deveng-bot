import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTermsPrivacyModal } from '@/context/terms-privacy-modal-context'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { openTerms, openPrivacy } = useTermsPrivacyModal()

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your email and password to create an account. <br />
            Already have an account?{' '}
            <Link
              to='/sign-in'
              className='hover:text-primary underline underline-offset-4'
            >
              Sign In
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By creating an account, you agree to our{' '}
            <button
              type='button'
              onClick={openTerms}
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type='button'
              onClick={openPrivacy}
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </button>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
