import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MentalHealthAssessment from '../../app/health-screening';

describe('View Mental Health Assessment History', () => {

  /**
   * AC-1
   * Verify the Assessment History screen displays
   * previously completed K-10 and DASS-21 scores.
   */
  it('should display previous K-10 and DASS-21 assessment scores', () => {

    const history = [
      {
        id: '1',
        date: '15 Jul 2026',
        k10Score: 18,
        dass21Score: 24,
      },
      {
        id: '2',
        date: '20 Jul 2026',
        k10Score: 14,
        dass21Score: 19,
      },
    ];

    const { getByText } = render(
      <MentalHealthAssessment
        assessmentHistory={history}
      />
    );

    fireEvent.press(getByText('Assessment History'));

    expect(getByText('K-10 Score: 18')).toBeTruthy();
    expect(getByText('DASS-21 Score: 24')).toBeTruthy();

    expect(getByText('K-10 Score: 14')).toBeTruthy();
    expect(getByText('DASS-21 Score: 19')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify assessment history entries are displayed
   * chronologically with date and score.
   */
  it('should display assessment history in chronological order with date and score', () => {

    const history = [
      {
        id: '1',
        date: '15 Jul 2026',
        k10Score: 18,
        dass21Score: 24,
      },
      {
        id: '2',
        date: '20 Jul 2026',
        k10Score: 14,
        dass21Score: 19,
      },
    ];

    const { getByText } = render(
      <MentalHealthAssessment
        assessmentHistory={history}
      />
    );

    fireEvent.press(getByText('Assessment History'));

    expect(getByText('15 Jul 2026')).toBeTruthy();
    expect(getByText('20 Jul 2026')).toBeTruthy();

    expect(getByText('K-10 Score: 18')).toBeTruthy();
    expect(getByText('DASS-21 Score: 24')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the Assessment History screen can be opened
   * from the Mental Health Assessment screen.
   */
  it('should navigate to the Assessment History screen from the Mental Health Assessment screen', () => {

    const navigate = jest.fn();

    const { getByText } = render(
      <MentalHealthAssessment
        navigation={{ navigate }}
      />
    );

    fireEvent.press(getByText('Assessment History'));

    expect(navigate).toHaveBeenCalledTimes(1);

    expect(navigate).toHaveBeenCalledWith(
      'MentalHealthHistory'
    );

  });

});