import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <Card className='w-full max-w-sm shadow-sm'>
      <CardHeader className='text-center'>
        <div className='flex justify-center mb-2'>
          <div className='w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center'>
            <ShieldAlert className='w-5 h-5 text-blue-600' />
          </div>
        </div>
        <CardTitle className='text-xl'>Create account</CardTitle>
        <CardDescription>Join CrisisComm today</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='first'>First name</Label>
            <Input id='first' placeholder='Ravi' />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='last'>Last name</Label>
            <Input id='last' placeholder='Kumar' />
          </div>
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='remail'>Email</Label>
          <Input id='remail' type='email' placeholder='you@example.com' />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='org'>Organization</Label>
          <Input id='org' placeholder='NDMA / State Emergency Cell' />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='rpassword'>Password</Label>
          <Input id='rpassword' type='password' placeholder='Min. 8 characters' />
        </div>
        <Button className='w-full' asChild><Link href='/dashboard'>Create account</Link></Button>
      </CardContent>
      <CardFooter className='justify-center'>
        <p className='text-xs text-slate-500'>
          Already have an account?{' '}
          <Link href='/login' className='text-blue-600 hover:underline font-medium'>Sign in</Link>
        </p>
      </CardFooter>
    </Card>
  );
}