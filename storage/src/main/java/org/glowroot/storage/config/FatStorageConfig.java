/*
 * Copyright 2013-2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.glowroot.storage.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.collect.ImmutableList;
import org.immutables.value.Value;

import org.glowroot.common.util.Versions;

@Value.Immutable
public abstract class FatStorageConfig implements StorageConfig {

    // 2 days, 2 weeks, 2 months, 1 year
    private static final ImmutableList<Integer> DEFAULT_ROLLUP_EXPIRATION_HOURS =
            ImmutableList.of(24 * 2, 24 * 14, 24 * 60, 24 * 365);

    private static final ImmutableList<Integer> DEFAULT_CAPPED_DATABASE_SIZES_MB =
            ImmutableList.of(500, 500, 500, 500);

    // TODO revisit this comment
    //
    // currently aggregate expiration should be at least as big as trace expiration
    // errors/messages page depends on this for calculating error percentage when using the filter
    @Override
    @Value.Default
    @SuppressWarnings("immutables")
    public ImmutableList<Integer> rollupExpirationHours() {
        return DEFAULT_ROLLUP_EXPIRATION_HOURS;
    }

    @Override
    @Value.Default
    public int traceExpirationHours() {
        // 2 weeks
        return 24 * 14;
    }

    @Value.Default
    @SuppressWarnings("immutables")
    public ImmutableList<Integer> rollupCappedDatabaseSizesMb() {
        return DEFAULT_CAPPED_DATABASE_SIZES_MB;
    }

    @Value.Default
    public int traceCappedDatabaseSizeMb() {
        return 500;
    }

    @Value.Derived
    @JsonIgnore
    public String version() {
        return Versions.getJsonVersion(this);
    }

    public boolean hasListIssues() {
        return rollupExpirationHours().size() != DEFAULT_ROLLUP_EXPIRATION_HOURS.size()
                || rollupCappedDatabaseSizesMb().size() != DEFAULT_CAPPED_DATABASE_SIZES_MB.size();
    }
}
