import { ExtendedIntakeData } from '../types';
import { ExtractedIntakeData } from './documentExtractionService';

export function buildExtendedIntake(d: ExtractedIntakeData, referralSource: string): ExtendedIntakeData {
  return {
    intake_admin: {
      total_clients: 1,
      primary_language: d.primaryLanguage || 'English',
      referral_source: referralSource || d.referralSource || 'Internet',
    },
    accident: {
      crash_report_number: d.policeReportNumber,
      agency: d.policeAgency,
      date_of_loss: d.accidentDate,
      time_of_accident: d.accidentTime,
      accident_location: d.accidentLocation,
      city: d.accidentCity,
      county: d.accidentCounty,
      accident_facts: d.accidentDescription,
      plaintiff_role: d.plaintiffRole,
      weather_conditions: d.weatherConditions,
      speed_limit: d.speedLimit ? parseInt(d.speedLimit) || undefined : undefined,
      plaintiff_direction: d.plaintiffDirection,
      defendant_direction: d.defendantDirection,
      main_intersections: d.mainIntersections,
    },
    client: {
      full_name: d.clientName,
      date_of_birth: d.clientDob,
      ssn: d.clientSsn,
      email: d.clientEmail,
      phones: {
        cell: d.clientPhone || d.clientCellPhone,
        home: d.clientHomePhone,
      },
      marital_status: d.clientMaritalStatus as any,
      address: {
        street: d.clientAddress,
        city: d.clientCity,
        state: d.clientState,
        zip: d.clientZip,
      },
      drivers_license: (d.clientDriversLicenseNumber || d.clientDriversLicenseState) ? {
        number: d.clientDriversLicenseNumber,
        state_issued: d.clientDriversLicenseState,
      } : undefined,
      emergency_contact: (d.emergencyContactName || d.emergencyContactPhone) ? {
        name: d.emergencyContactName,
        phone: d.emergencyContactPhone,
      } : undefined,
    },
    employment: {
      time_lost_from_work: d.timeLostFromWork,
      how_much_time_lost: d.timeLostAmount,
      position: d.employmentPosition,
      employer: (d.employerName || d.employerPhone || d.employerAddress) ? {
        name: d.employerName,
        phone: d.employerPhone,
        address: d.employerAddress ? { street: d.employerAddress } : undefined,
      } : undefined,
      wages: (d.wagesAmount || d.wagesPer) ? {
        amount: d.wagesAmount ? parseFloat(d.wagesAmount) || undefined : undefined,
        per: d.wagesPer as any,
      } : undefined,
    },
    vehicle_property_damage: {
      license_plate: d.vehicleLicensePlate,
      damaged_vehicle: {
        year: d.vehicleYear ? parseInt(d.vehicleYear) || undefined : undefined,
        make: d.vehicleMake,
        model: d.vehicleModel,
        color: d.vehicleColor,
      },
      vehicle_drivable: d.vehicleDrivable,
      airbags_deployed: d.airbags,
      seatbelt_worn: d.seatbeltWorn,
      property_damage_amount_or_estimate: d.propertyDamageEstimate ? parseFloat(d.propertyDamageEstimate) || undefined : undefined,
      body_shop: (d.bodyShopName || d.bodyShopPhone || d.bodyShopAddress) ? {
        name: d.bodyShopName,
        phone: d.bodyShopPhone,
        address: d.bodyShopAddress,
      } : undefined,
    },
    medical: {
      injuries_detail: d.injuries,
      ambulance: d.ambulance,
      xrays_taken: d.xraysTaken,
      hospital: (d.hospitalName || d.hospitalAddress || d.hospitalPhone) ? {
        name: d.hospitalName,
        address: d.hospitalAddress,
        phone: d.hospitalPhone,
      } : undefined,
      pre_existing_conditions: d.preExistingConditions,
      doctor_referred_to: d.doctorReferredTo ? { name: d.doctorReferredTo } : undefined,
      providers: d.treatmentProviders
        ? d.treatmentProviders.split(/[,;]/).map(p => p.trim()).filter(Boolean).map(name => ({ name }))
        : [],
    },
    defendant: {
      name: d.defendantName,
      phone: d.defendantPhone,
      address: (d.defendantAddressStreet || d.defendantAddressCity) ? {
        street: d.defendantAddressStreet,
        city: d.defendantAddressCity,
        state: d.defendantAddressState,
        zip: d.defendantAddressZip,
      } : undefined,
      drivers_license_number: d.defendantDriversLicense,
      license_plate: d.defendantLicensePlate,
      vehicle: (d.defendantVehicleYear || d.defendantVehicleMake || d.defendantVehicleModel) ? {
        year: d.defendantVehicleYear ? parseInt(d.defendantVehicleYear) || undefined : undefined,
        make: d.defendantVehicleMake,
        model: d.defendantVehicleModel,
        color: d.defendantVehicleColor,
      } : undefined,
      insurance: (d.defendantInsurance || d.defendantPolicyNumber || d.defendantClaimNumber) ? {
        company: d.defendantInsurance,
        type: d.defendantInsuranceType as any,
        policy_number: d.defendantPolicyNumber,
        claim_number: d.defendantClaimNumber,
        claims_adjuster: (d.defendantAdjusterName || d.defendantAdjusterPhone) ? {
          name: d.defendantAdjusterName,
          phone: d.defendantAdjusterPhone,
        } : undefined,
        coverage_limits: d.defendantCoverageLimits,
      } : undefined,
    },
    first_party_insurance: (d.clientInsurance || d.clientPolicyNumber || d.clientClaimNumber) ? {
      company: d.clientInsurance,
      policy_number: d.clientPolicyNumber,
      claim_number: d.clientClaimNumber,
      coverage_limits: d.clientInsuranceCoverageLimits,
    } : undefined,
    health_insurance: (d.healthInsuranceCompany || d.healthInsuranceMemberNumber) ? {
      company: d.healthInsuranceCompany,
      member_number: d.healthInsuranceMemberNumber,
      group_number: d.healthInsuranceGroupNumber,
    } : undefined,
    notes: d.notes,
  };
}
