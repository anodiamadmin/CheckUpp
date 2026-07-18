import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MentalHealthAssessment from '../../app/health-screening';

describe('Auto Save Mental Health Assessment', () => {

  /**
   * AC-1
   * Verify assessment field values are automatically
   * saved whenever they are entered or updated.
   */
  it('should automatically save assessment field values when updated', async () => {

    const autoSave = jest.fn();

    const { getByTestId } = render(
      <MentalHealthAssessment
        onAutoSave={autoSave}
      />
    );

    fireEvent.changeText(
      getByTestId('k10-score-input'),
      '18'
    );

    fireEvent.changeText(
      getByTestId('dass21-depression-input'),
      '12'
    );

    fireEvent.changeText(
      getByTestId('dass21-anxiety-input'),
      '10'
    );

    await waitFor(() => {
      expect(autoSave).toHaveBeenCalled();
    });

    expect(autoSave).toHaveBeenCalledWith(
      expect.objectContaining({
        k10Score: '18',
        dass21Depression: '12',
        dass21Anxiety: '10',
      })
    );

  });

  /**
   * AC-2
   * Verify toggle switch values are automatically
   * saved whenever they are changed.
   */
  it('should automatically save toggle switch values when changed', async () => {

    const autoSave = jest.fn();

    const { getByTestId } = render(
      <MentalHealthAssessment
        onAutoSave={autoSave}
      />
    );

    fireEvent(getByTestId('difficulty-falling-asleep-switch'), 'valueChange', true);

    fireEvent(getByTestId('frequent-night-waking-switch'), 'valueChange', true);

    fireEvent(getByTestId('substance-use-switch'), 'valueChange', true);

    fireEvent(getByTestId('persistent-sadness-switch'), 'valueChange', true);

    fireEvent(getByTestId('loss-of-interest-switch'), 'valueChange', true);

    fireEvent(getByTestId('anxious-feelings-switch'), 'valueChange', true);

    fireEvent(getByTestId('irritability-switch'), 'valueChange', true);

    fireEvent(getByTestId('concentration-switch'), 'valueChange', true);

    fireEvent(getByTestId('fatigue-switch'), 'valueChange', true);

    await waitFor(() => {
      expect(autoSave).toHaveBeenCalled();
    });

    expect(autoSave).toHaveBeenCalledWith(
      expect.objectContaining({
        difficultyFallingAsleep: true,
        frequentNightWaking: true,
        substanceUse: true,
        persistentSadness: true,
        lossOfInterest: true,
        anxiousFeelings: true,
        irritability: true,
        concentrationProblems: true,
        fatigue: true,
      })
    );

  });

  /**
   * AC-3
   * Verify dropdown selections are automatically
   * saved whenever they are changed.
   */
  it('should automatically save dropdown values when changed', async () => {

    const autoSave = jest.fn();

    const { getByTestId } = render(
      <MentalHealthAssessment
        onAutoSave={autoSave}
      />
    );

    fireEvent(getByTestId('exercise-frequency-dropdown'), 'onValueChange', '3-5 days/week');

    fireEvent(getByTestId('social-support-dropdown'), 'onValueChange', 'Strong');

    fireEvent(getByTestId('work-life-stress-dropdown'), 'onValueChange', 'Moderate');

    await waitFor(() => {
      expect(autoSave).toHaveBeenCalled();
    });

    expect(autoSave).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseFrequency: '3-5 days/week',
        socialSupport: 'Strong',
        workLifeStress: 'Moderate',
      })
    );

  });

});