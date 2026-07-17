import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MentalHealthAssessment from '../../app/health-screening';

describe('Track Mental Health Log', () => {

  /**
   * AC-1
   * Verify the screen displays fields for
   * sleep quality, sleep quantity and exercise.
   */
  it('should display fields for sleep quality, sleep quantity and exercise', () => {

    const { getByPlaceholderText } = render(
      <MentalHealthAssessment />
    );

    expect(
      getByPlaceholderText('Sleep Quality')
    ).toBeTruthy();

    expect(
      getByPlaceholderText('Sleep Quantity')
    ).toBeTruthy();

    expect(
      getByPlaceholderText('Exercise')
    ).toBeTruthy();

  });

  /**
   * AC-2
   * Verify the symptom checklist is displayed.
   */
  it('should display the symptom checklist', () => {

    const { getByText } = render(
      <MentalHealthAssessment />
    );

    expect(getByText('Symptoms')).toBeTruthy();

    expect(getByText('Anxiety')).toBeTruthy();

    expect(getByText('Stress')).toBeTruthy();

    expect(getByText('Depressed Mood')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the free-text notes field is displayed.
   */
  it('should display a free-text notes field', () => {

    const { getByPlaceholderText } = render(
      <MentalHealthAssessment />
    );

    expect(
      getByPlaceholderText('Enter your notes')
    ).toBeTruthy();

  });

  /**
   * AC-4
   * Verify all entered information is saved
   * together with the completion timestamp.
   */
  it('should save all mental health log fields with a timestamp', () => {

    const saveMentalHealthLog = jest.fn();

    const { getByPlaceholderText, getByTestId } = render(
      <MentalHealthAssessment
        onSave={saveMentalHealthLog}
      />
    );

    fireEvent.changeText(
      getByPlaceholderText('Sleep Quality'),
      'Good'
    );

    fireEvent.changeText(
      getByPlaceholderText('Sleep Quantity'),
      '8 Hours'
    );

    fireEvent.changeText(
      getByPlaceholderText('Exercise'),
      '30 Minutes Walk'
    );

    fireEvent.press(
      getByTestId('symptom-anxiety')
    );

    fireEvent.changeText(
      getByPlaceholderText('Enter your notes'),
      'Feeling much better today.'
    );

    fireEvent.press(
      getByTestId('save-mental-health-log')
    );

    expect(saveMentalHealthLog).toHaveBeenCalledTimes(1);

    expect(saveMentalHealthLog).toHaveBeenCalledWith(
      expect.objectContaining({
        sleepQuality: 'Good',
        sleepQuantity: '8 Hours',
        exercise: '30 Minutes Walk',
        symptoms: expect.any(Array),
        notes: 'Feeling much better today.',
        recordedAt: expect.any(String),
      })
    );

  });

});