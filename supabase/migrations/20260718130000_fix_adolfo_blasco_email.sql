-- adolfo.blasco.asesor@gmail.com (set in the prior migration) turned out
-- not to match his real GHL contact record — confirmed via
-- sync-ghl-onboarding that his GHL contact uses adolfo.blasco@ovb.es
-- (the OVB-branded email from when he booked his original call).
-- Using that one instead so sync-ghl-onboarding's automatic email lookup
-- works without a manual override.
update clients set email = 'adolfo.blasco@ovb.es'
where id = 'c71488f4-0f94-4850-9a96-bc97fbaf5171'; -- Adolfo Blasco
