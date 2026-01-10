package com.amandita.customer;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RoleService {
    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public Optional<Role> findByName(String roleName) {
        return roleRepository.findByName(roleName);
    }
}