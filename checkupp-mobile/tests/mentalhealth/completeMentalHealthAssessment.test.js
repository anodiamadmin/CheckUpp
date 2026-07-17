import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MentalHealthAssessment from '../../app/health-screening';

describe('Complete Mental Health Assessment', () => {

  /**
   * AC-1
   * Verify that both K-10 and DASS-21 questionnaires
   * are displayed on the Mental Health Assessment screen.
   */
  it('should display the K-10 and DASS-21 questionnaires', () => {

    const { getByText } = render(
      <MentalHealthAssessment />
    );

    expect(getByText('K-10 Psychological Distress Scale')).toBeTruthy();

    expect(getByText('DASS-21 Assessment')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify that assessment scores are calculated automatically
   * after the user completes the questionnaires.
   */
  it('should automatically calculate the K-10 and DASS-21 scores', () => {

    const { getByTestId, getByText } = render(
      <MentalHealthAssessment />
    );

    fireEvent.press(getByTestId('k10-question-1-option-3'));
    fireEvent.press(getByTestId('k10-question-2-option-2'));
    fireEvent.press(getByTestId('k10-question-3-option-4'));

    fireEvent.press(getByTestId('dass-question-1-option-1'));
    fireEvent.press(getByTestId('dass-question-2-option-3'));
    fireEvent.press(getByTestId('dass-question-3-option-2'));

    fireEvent.press(getByTestId('submit-assessment'));

    expect(getByText(/K-10 Score/i)).toBeTruthy();

    expect(getByText(/DASS-21 Score/i)).toBeTruthy();

  });

  /**
   * AC-3
   * Verify that the assessment results are stored
   * together with the completion timestamp.
   */
  it('should save the assessment results with a timestamp', () => {

    const saveAssessment = jest.fn();

    const { getByTestId } = render(
      <MentalHealthAssessment
        onSave={saveAssessment}
      />
    );

    fireEvent.press(getByTestId('submit-assessment'));

    expect(saveAssessment).toHaveBeenCalledTimes(1);

    expect(saveAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        k10Score: expect.any(Number),
        dass21Score: expect.any(Number),
        completedAt: expect.any(String),
      })
    );

  });

});