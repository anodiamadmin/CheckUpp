import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ImmunisationPage from '../../app/immunization/index';

describe('View Age Based Vaccinations', () => {

  /**
   * AC-1
   * Verify only vaccinations recommended for users aged
   * 50 years and above are displayed.
   */
  it('should display only vaccinations recommended for users aged 50 years and above', () => {

    const user = {
      age: 55,
    };

    const recommendations = [
      {
        id: '1',
        vaccineName: 'Shingles Vaccine',
        minimumAge: 50,
      },
      {
        id: '2',
        vaccineName: 'Pneumococcal Vaccine',
        minimumAge: 50,
      },
      {
        id: '3',
        vaccineName: 'HPV Vaccine',
        minimumAge: 12,
        maximumAge: 26,
      },
    ];

    const { getByText, queryByText } = render(
      <ImmunisationPage
        user={user}
        recommendations={recommendations}
      />
    );

    expect(getByText('Shingles Vaccine')).toBeTruthy();
    expect(getByText('Pneumococcal Vaccine')).toBeTruthy();

    expect(queryByText('HPV Vaccine')).toBeNull();

  });

  /**
   * AC-2
   * Verify the user can view detailed information
   * for an age-appropriate vaccine.
   */
  it('should display vaccine details when a recommended vaccine is selected', () => {

    const user = {
      age: 55,
    };

    const recommendations = [
      {
        id: '1',
        vaccineName: 'Shingles Vaccine',
        description: 'Recommended for adults aged 50 years and older.',
      },
    ];

    const { getByText } = render(
      <ImmunisationPage
        user={user}
        recommendations={recommendations}
      />
    );

    fireEvent.press(getByText('Shingles Vaccine'));

    expect(
      getByText('Recommended for adults aged 50 years and older.')
    ).toBeTruthy();

  });

  /**
   * AC-3
   * Verify vaccinations that are not recommended
   * are not displayed.
   */
  it('should not display vaccines that are not recommended for users aged 50 years and above', () => {

    const user = {
      age: 60,
    };

    const recommendations = [
      {
        id: '1',
        vaccineName: 'Pneumococcal Vaccine',
        minimumAge: 50,
      },
      {
        id: '2',
        vaccineName: 'Rotavirus Vaccine',
        minimumAge: 0,
        maximumAge: 1,
      },
    ];

    const { getByText, queryByText } = render(
      <ImmunisationPage
        user={user}
        recommendations={recommendations}
      />
    );

    expect(getByText('Pneumococcal Vaccine')).toBeTruthy();

    expect(
      queryByText('Rotavirus Vaccine')
    ).toBeNull();

  });

  /**
   * AC-4
   * Verify an appropriate message is displayed
   * when the user's age is unavailable or invalid.
   */
  it('should display an appropriate message when age information is unavailable', () => {

    const user = {
      age: null,
    };

    const { getByText } = render(
      <ImmunisationPage
        user={user}
        recommendations={[]}
      />
    );

    expect(
      getByText(
        'Age-specific vaccination recommendations cannot be shown until your profile information is updated.'
      )
    ).toBeTruthy();

  });

});