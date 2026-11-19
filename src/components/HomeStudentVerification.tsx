import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudentVerificationForm } from './StudentVerificationForm';

export const HomeStudentVerification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get('verify') || '';

  return (
    <StudentVerificationForm
      variant="section"
      initialStudentId={initialStudentId}
      showResultsLink
      inputId="home-student-id-search"
    />
  );
};
