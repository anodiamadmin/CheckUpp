import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MentalHealthAssessment from '../../app/health-screening';

describe('Restore Mental Health Assessment', () => {

  /**
   * AC-1
   * Verify previously autosaved assessment data
   * is restored automatically when the user revisits
   * the Mental Health Assessment screen.
   */
  it('should automatically restore previously autosaved assessment data', async () => {

    const savedAssessment = {
      k10Score: '18',
      dass21Depression: '12',
      dass21Anxiety: '10',
      difficultyFallingAsleep: true,
      frequentNightWaking: false,
      notes: 'Feeling better today.',
    };

    const { getByDisplayValue } = render(
      <MentalHealthAssessment
        restoredData={savedAssessment}
      />
    );

    await waitFor(() => {
      expect(getByDisplayValue('18')).toBeTruthy();
      expect(getByDisplayValue('12')).toBeTruthy();
      expect(getByDisplayValue('10')).toBeTruthy();
      expect(getByDisplayValue('Feeling better today.')).toBeTruthy();
    });

  });

  /**
   * AC-2
   * Verify a "Data restored" toast notification
   * is displayed only when saved data exists.
   */
  it('should display a "Data restored" toast when autosaved data is restored', async () => {

    const showToast = jest.fn();

    render(
      <MentalHealthAssessment
        restoredData={{
          k10Score: '18',
        }}
        showToast={showToast}
      />
    );

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Data restored',
        'success'
      );
    });

  });

  /**
   * AC-2 (Negative)
   * Verify the toast is not displayed
   * when no autosaved data exists.
   */
  it('should not display the "Data restored" toast when no saved data exists', async () => {

    const showToast = jest.fn();

    render(
      <MentalHealthAssessment
        restoredData={null}
        showToast={showToast}
      />
    );

    await waitFor(() => {
      expect(showToast).not.toHaveBeenCalled();
    });

  });

  /**
   * AC-3
   * Verify all restored values match
   * the most recently autosaved data.
   */
  it('should restore all assessment fields and toggle switch values correctly', async () => {

    const savedAssessment = {
      k10Score: '18',
      dass21Depression: '12',
      dass21Anxiety: '10',
      difficultyFallingAsleep: true,
      frequentNightWaking: true,
      exerciseFrequency: '3-5 days/week',
      socialSupport: 'Strong',
      workLifeStress: 'Moderate',
      notes: 'Feeling much better.',
    };

    const { getByDisplayValue, getByTestId } = render(
      <MentalHealthAssessment
        restoredData={savedAssessment}
      />
    );

    await waitFor(() => {

      expect(getByDisplayValue('18')).toBeTruthy();
      expect(getByDisplayValue('12')).toBeTruthy();
      expect(getByDisplayValue('10')).toBeTruthy();

      expect(
        getByDisplayValue('Feeling much better.')
      ).toBeTruthy();

      expect(
        getByTestId('difficulty-falling-asleep-switch').props.value
      ).toBe(true);

      expect(
        getByTestId('frequent-night-waking-switch').props.value
      ).toBe(true);

    });

  });

  /**
   * AC-4
   * Verify restored data and the notification
   * are displayed automatically without any user action.
   */
  it('should automatically display restored data and the "Data restored" notification', async () => {

    const showToast = jest.fn();

    const { getByDisplayValue } = render(
      <MentalHealthAssessment
        restoredData={{
          k10Score: '18',
        }}
        showToast={showToast}
      />
    );

    await waitFor(() => {

      expect(getByDisplayValue('18')).toBeTruthy();

      expect(showToast).toHaveBeenCalledWith(
        'Data restored',
        'success'
      );

    });

  });

});