import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { CircleCheck } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { ErrorState, Notice } from '@/components/Feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { message } from '@/api/client';
import { enumLabel, faultCategories, faultSchema, hasAnyRole, priorities, uuid } from './format';
import { useReportFault } from './queries';
export function ReportFaultForm() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const selected = uuid.safeParse(params.get('equipmentId'));
  const mutation = useReportFault();
  const [created, setCreated] = useState('');
  const form = useForm<z.infer<typeof faultSchema>>({
    resolver: zodResolver(faultSchema),
    defaultValues: {
      equipmentId: selected.success ? selected.data : '',
      loanId: '',
      faultDescription: '',
      faultCategory: 'OTHER',
      priority: 'MEDIUM',
    },
  });
  const errors = form.formState.errors;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a fault</CardTitle>
        <CardDescription>Tell us what happened so the equipment can be assessed.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            setCreated('');
            try {
              const item = await mutation.mutateAsync({
                equipmentId: values.equipmentId,
                ...(values.loanId ? { loanId: values.loanId } : {}),
                faultDescription: values.faultDescription,
                faultCategory: values.faultCategory,
                priority: values.priority,
              });
              setCreated(item.maintenanceCaseId);
              form.reset({
                equipmentId: '',
                loanId: '',
                faultDescription: '',
                faultCategory: 'OTHER',
                priority: 'MEDIUM',
              });
            } catch {
              /* ProblemDetail is rendered below. */
            }
          })}
        >
          <Field
            label="Equipment ID"
            id="fault-equipment"
            error={errors.equipmentId?.message}
            hint={
              <>
                <Link to="/equipment" className="text-primary underline underline-offset-4">
                  Find equipment
                </Link>{' '}
                and choose Report fault to select it here.
              </>
            }
          >
            <Input placeholder="Equipment UUID" {...form.register('equipmentId')} />
          </Field>
          <Field label="Loan ID (optional)" id="fault-loan" error={errors.loanId?.message}>
            <Input {...form.register('loanId')} />
          </Field>
          <Field label="Fault category" id="fault-category">
            <Select {...form.register('faultCategory')}>
              {faultCategories.map((category) => (
                <option key={category} value={category}>
                  {enumLabel(category)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" id="fault-priority">
            <Select {...form.register('priority')}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {enumLabel(priority)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Fault description"
            id="fault-description"
            className="sm:col-span-2"
            error={errors.faultDescription?.message}
          >
            <Textarea rows={4} {...form.register('faultDescription')} />
          </Field>
          <Button className="justify-self-start" disabled={mutation.isPending}>
            {mutation.isPending ? 'Reporting…' : 'Submit fault report'}
          </Button>
        </form>
        {mutation.isError && <ErrorState message={message(mutation.error)} />}
        {created && (
          <Notice tone="success" role="status">
            <CircleCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>
              Fault reported successfully. Case ID: {created}
              {hasAnyRole(user?.roles, 'CUSTODIAN', 'ADMIN') && (
                <>
                  {' '}
                  ·{' '}
                  <Link
                    to={'/maintenance/cases/' + created}
                    className="font-semibold underline underline-offset-4"
                  >
                    View case
                  </Link>
                </>
              )}
            </span>
          </Notice>
        )}
      </CardContent>
    </Card>
  );
}
