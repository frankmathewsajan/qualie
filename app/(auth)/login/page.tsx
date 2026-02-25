import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  return (
    <Card className='w-full max-w-sm shadow-sm'>
      <CardHeader className='text-center'>
        <div className='flex justify-center mb-2'>
          <div className='w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center'>
            <ShieldAlert className='w-5 h-5 text-blue-600' />
          </div>
        </div>
        <CardTitle className='text-xl'>Welcome back</CardTitle>
        <CardDescription>Sign in to CrisisComm</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='email'>Email</Label>
          <Input id='email' type='email' placeholder='you@example.com' />
        </div>
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='password'>Password</Label>
            <Link href='#' className='text-xs text-blue-600 hover:underline'>Forgot?</Link>
          </div>
          <Input id='password' type='password' placeholder='••••••••' />
        </div>
        <Button className='w-full' asChild><Link href='/dashboard'>Sign in</Link></Button>
        <div className='relative flex items-center'>
          <Separator className='flex-1' />
          <span className='px-2 text-xs text-slate-400'>or</span>
          <Separator className='flex-1' />
        </div>
        <Button variant='outline' className='w-full' asChild>
          <Link href='/dashboard'>Continue as guest</Link>
        </Button>
      </CardContent>
      <CardFooter className='justify-center'>
        <p className='text-xs text-slate-500'>
          No account?{' '}
          <Link href='/register' className='text-blue-600 hover:underline font-medium'>Sign up</Link>
        </p>
      </CardFooter>
    </Card>
  );
}