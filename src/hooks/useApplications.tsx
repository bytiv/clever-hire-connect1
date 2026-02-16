import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ATS_API_URL } from '@/lib/config';

export interface JobSeekerApplication {
  id: string;
  job_id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  applied_at: string;
  cover_letter: string | null;
  ats_score: number | null;
  predicted_category: string | null;
  confidence_score: number | null;
  ats_calculated_at: string | null;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    salary: string | null;
    description: string;
  };
}

export const useApplications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Fetch the current user's applications
  // ---------------------------------------------------------------------------
  const { data: myApplications = [], isLoading } = useQuery({
    queryKey: ['applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          status,
          applied_at,
          cover_letter,
          ats_score,
          predicted_category,
          confidence_score,
          ats_calculated_at,
          jobs:job_id (
            id, title, company, location, type, salary, description
          )
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ---------------------------------------------------------------------------
  // Helper – call the ATS API and persist the result
  // ---------------------------------------------------------------------------
  const calculateAndSaveAtsScore = async (
    applicationId: string,
    jobDescription: string,
    resumeFilePath: string,
  ) => {
    if (!ATS_API_URL) throw new Error('ATS API URL is not configured');

    // 1. Download the resume from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resumeFilePath);

    if (downloadError) throw downloadError;

    // 2. Build multipart form – **include a filename** so Flask sees it in
    //    request.files (without a filename the Blob is treated as a field).
    const formData = new FormData();
    formData.append('job_description', jobDescription);
    formData.append('resume_file', fileData, 'resume.pdf');

    // 3. Call the ATS scoring API
    const response = await fetch(`${ATS_API_URL}/analyze-resume`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`ATS API error (${response.status}): ${errBody}`);
    }

    const result = await response.json();

    // 4. Persist ATS results back to the applications table
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        ats_score: result.ats_score,
        predicted_category: result.predicted_category,
        confidence_score: result.confidence,
        ats_calculated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // 5. Notify user & refresh cache
    toast({
      title: `ATS Score: ${result.ats_score.toFixed(1)}%`,
      description: `Category: ${result.predicted_category}`,
    });
    queryClient.invalidateQueries({ queryKey: ['applications'] });

    return result;
  };

  // ---------------------------------------------------------------------------
  // Apply to a job
  // ---------------------------------------------------------------------------
  const applyToJobMutation = useMutation({
    mutationFn: async ({
      jobId,
      jobDescription,
      coverLetter,
    }: {
      jobId: string;
      jobDescription: string;
      coverLetter?: string;
    }) => {
      if (!user?.id) throw new Error('Please log in to apply for jobs');

      // Ensure the user has uploaded a resume
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('file_path, file_name')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resumeError || !resumeData?.file_path) {
        throw new Error('RESUME_REQUIRED');
      }

      // Prevent duplicate applications
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) throw new Error('You have already applied to this job!');

      // Insert the application
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          user_id: user.id,
          status: 'pending',
          cover_letter: coverLetter || null,
        })
        .select('id')
        .single();

      if (applicationError) throw applicationError;

      // Fire-and-forget ATS calculation (don't fail the application)
      calculateAndSaveAtsScore(
        applicationData.id,
        jobDescription,
        resumeData.file_path,
      ).catch((err) => console.error('ATS calculation failed:', err));

      return applicationData;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({
        title: 'Application submitted! 🎉',
        description: 'Your ATS score is being calculated…',
      });
    },

    onError: (error: Error) => {
      if (error.message === 'RESUME_REQUIRED') {
        toast({
          title: 'Resume Required',
          description: 'Please upload your resume before applying.',
          variant: 'destructive',
        });
      } else if (error.message.includes('already applied')) {
        toast({
          title: 'Already Applied',
          description: 'You have already applied to this job!',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Application Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  // Convenience wrapper
  const applyToJob = (
    jobId: string,
    jobDescription: string,
    coverLetter?: string,
  ) => {
    applyToJobMutation.mutate({ jobId, jobDescription, coverLetter });
  };

  return {
    myApplications,
    loading: isLoading,
    error: null,
    applyToJob,
    isApplying: applyToJobMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  };
};
